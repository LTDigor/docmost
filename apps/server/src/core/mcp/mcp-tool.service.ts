import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SearchService } from '../search/search.service';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../page/page-access/page-access.service';
import { PageService } from '../page/services/page.service';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { McpAuditService } from './mcp-audit.service';
import { McpTextSerializer } from './mcp-text-serializer';
import { McpRequestContext } from './mcp.types';

@Injectable()
export class McpToolService {
  constructor(
    private readonly searchService: SearchService,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
    private readonly pageService: PageService,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly spaceRepo: SpaceRepo,
    private readonly serializer: McpTextSerializer,
    private readonly auditService: McpAuditService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async searchPages(
    input: { query: string; spaceId?: string; limit?: number },
    context: McpRequestContext,
  ): Promise<CallToolResult> {
    const limit = this.clampLimit(input.limit);
    const query = this.normalizeQuery(input.query);

    if (input.spaceId) {
      await this.assertVisibleSpace(input.spaceId, context);
    }

    const result = await this.searchService.searchPage(
      {
        query,
        spaceId: input.spaceId,
        limit,
        offset: 0,
      },
      { userId: context.user.id, workspaceId: context.workspace.id },
    );

    const scopedItems = await this.enrichSearchItems(
      result.items
        .filter((item: any) =>
          this.isSpaceInTokenScope(item.space?.id, context),
        )
        .slice(0, limit),
      context,
    );

    await this.auditService.log({
      workspaceId: context.workspace.id,
      actorId: context.token.id,
      actorType: 'mcp_token',
      event: AuditEvent.MCP_SEARCH,
      resourceType: AuditResource.MCP_TOKEN,
      resourceId: context.token.id,
      spaceId: input.spaceId,
      metadata: {
        tool: 'search_pages',
        resultCount: scopedItems.length,
        queryPreview: query.slice(0, 120),
      },
      ipAddress: context.ipAddress,
    });

    return this.result(
      scopedItems.length
        ? scopedItems
            .map(
              (item, index) =>
                `${index + 1}. ${item.title}\n${item.sourceUrl}${
                  item.excerpt ? `\n${item.excerpt}` : ''
                }`,
            )
            .join('\n\n')
        : 'No matching pages found.',
      { items: scopedItems },
    );
  }

  async getRelevantContext(
    input: {
      query: string;
      spaceId?: string;
      limit?: number;
      maxChars?: number;
    },
    context: McpRequestContext,
  ): Promise<CallToolResult> {
    const query = this.normalizeQuery(input.query);
    const maxChars = this.clampContextChars(input.maxChars);
    const searchResult = await this.searchPages(
      { query, spaceId: input.spaceId, limit: input.limit },
      context,
    );
    const searchItems = (searchResult.structuredContent as any).items ?? [];
    const items: any[] = [];
    const sections = [`Relevant Docmost context for: ${query}`];
    let remainingChars = maxChars;

    for (const searchItem of searchItems) {
      if (remainingChars <= 0) break;

      const page = await this.findReadablePage(searchItem.pageId, context);
      const markdown = this.serializer.serializePageContent(
        (page as any).content,
      );
      const content = this.takeChars(markdown, remainingChars);
      remainingChars = Math.max(remainingChars - content.length, 0);

      const item = {
        ...searchItem,
        content,
      };
      items.push(item);

      sections.push(
        [
          `## ${searchItem.title}`,
          `Source: ${searchItem.sourceUrl}`,
          searchItem.breadcrumbs?.length
            ? `Breadcrumbs: ${searchItem.breadcrumbs.join(' > ')}`
            : undefined,
          content,
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
    }

    await this.auditService.log({
      workspaceId: context.workspace.id,
      actorId: context.token.id,
      actorType: 'mcp_token',
      event: AuditEvent.MCP_CONTEXT_READ,
      resourceType: AuditResource.MCP_TOKEN,
      resourceId: context.token.id,
      spaceId: input.spaceId,
      metadata: {
        tool: 'get_relevant_context',
        sourcePageCount: items.length,
        queryPreview: query.slice(0, 120),
        maxChars,
      },
      ipAddress: context.ipAddress,
    });

    return this.result(
      items.length
        ? sections.join('\n\n---\n\n')
        : `No relevant Docmost context found for: ${query}`,
      { query, items },
    );
  }

  async getPage(
    input: { pageId: string },
    context: McpRequestContext,
  ): Promise<CallToolResult> {
    const page = await this.pageRepo.findById(input.pageId, {
      includeContent: true,
      includeSpace: true,
    });

    if (!page || page.deletedAt || page.workspaceId !== context.workspace.id) {
      throw new NotFoundException('Page not found');
    }

    this.assertTokenSpaceScope(page.spaceId, context);
    await this.pageAccessService.validateCanView(page, context.user);

    const sourceUrl = this.serializer.buildPageUrl(page as any);
    const markdown = this.serializer.truncateForMcp(
      this.serializer.serializePageContent((page as any).content),
    );

    await this.auditService.log({
      workspaceId: context.workspace.id,
      actorId: context.token.id,
      actorType: 'mcp_token',
      event: AuditEvent.MCP_PAGE_READ,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      metadata: {
        tool: 'get_page',
        sourceUrl,
      },
      ipAddress: context.ipAddress,
    });

    return this.result(
      `# ${page.title}\n\nSource: ${sourceUrl}\n\n${markdown}`,
      {
        page: {
          pageId: page.id,
          title: page.title,
          sourceUrl,
          space: (page as any).space,
          updatedAt: page.updatedAt,
          content: markdown,
        },
      },
    );
  }

  async listSpaces(context: McpRequestContext): Promise<CallToolResult> {
    const spaces = await this.spaceMemberRepo.getUserSpaces(context.user.id, {
      limit: 100,
    } as any);

    const items = spaces.items
      .filter((space: any) => this.isSpaceInTokenScope(space.id, context))
      .map((space: any) => ({
        id: space.id,
        name: space.name,
        slug: space.slug,
      }));

    return this.result(
      items.map((space) => `${space.name} (${space.slug})`).join('\n') ||
        'No spaces available.',
      { items },
    );
  }

  async listChildPages(
    input: { pageId?: string; spaceId?: string; limit?: number },
    context: McpRequestContext,
  ): Promise<CallToolResult> {
    if (!input.pageId && !input.spaceId) {
      throw new BadRequestException('Either pageId or spaceId is required');
    }

    const limit = this.clampLimit(input.limit);
    let spaceId = input.spaceId;
    let parentPageId = input.pageId;

    if (parentPageId) {
      const page = await this.pageRepo.findById(parentPageId);
      if (
        !page ||
        page.deletedAt ||
        page.workspaceId !== context.workspace.id
      ) {
        throw new NotFoundException('Page not found');
      }
      this.assertTokenSpaceScope(page.spaceId, context);
      await this.pageAccessService.validateCanView(page, context.user);
      spaceId = page.spaceId;
    } else {
      await this.assertVisibleSpace(spaceId, context);
    }

    const result = await this.pageService.getSidebarPages(
      spaceId,
      { limit } as any,
      parentPageId,
      context.user.id,
      false,
    );
    const space = await this.spaceRepo.findById(spaceId, context.workspace.id);

    const items = result.items.map((page: any) => ({
      pageId: page.id,
      title: page.title,
      parentPageId: page.parentPageId,
      hasChildren: page.hasChildren,
      sourceUrl: this.serializer.buildPageUrl({
        ...page,
        space: { slug: space?.slug || '' },
      } as any),
      updatedAt: page.updatedAt,
    }));

    return this.result(
      items.map((page) => `${page.title} (${page.pageId})`).join('\n') ||
        'No child pages found.',
      { items },
    );
  }

  getContext(context: McpRequestContext): CallToolResult {
    return this.result(
      `Workspace: ${context.workspace.name}\nUser: ${context.user.name}\nToken: ${context.token.name}`,
      {
        workspace: {
          id: context.workspace.id,
          name: context.workspace.name,
        },
        user: {
          id: context.user.id,
          name: context.user.name,
        },
        token: {
          name: context.token.name,
          allowedSpaceIds: context.token.allowedSpaceIds,
        },
      },
    );
  }

  private result(text: string, structuredContent: Record<string, any>) {
    return {
      content: [{ type: 'text' as const, text }],
      structuredContent,
    };
  }

  private clampLimit(limit?: number): number {
    const max = this.environmentService.getMcpMaxSearchResults();
    if (!limit) return max;
    return Math.min(Math.max(limit, 1), max);
  }

  private clampContextChars(maxChars?: number): number {
    const max = this.environmentService.getMcpMaxPageChars();
    if (!maxChars) return max;
    return Math.min(Math.max(maxChars, 1000), max);
  }

  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
  }

  private takeChars(markdown: string, maxChars: number): string {
    if (markdown.length <= maxChars) return markdown;
    return `${markdown.slice(0, maxChars).trimEnd()}\n\n[Context truncated]`;
  }

  private async enrichSearchItems(
    items: any[],
    context: McpRequestContext,
  ): Promise<any[]> {
    return Promise.all(
      items.map(async (item: any) => {
        const parent = await this.findVisibleParent(item.parentPageId, context);
        const breadcrumbs = [
          item.space?.name,
          parent?.title,
          item.title,
        ].filter(Boolean);

        return {
          pageId: item.id,
          title: item.title,
          parentPageId: item.parentPageId,
          parentTitle: parent?.title,
          breadcrumbs,
          excerpt: this.serializer.stripHtml(item.highlight),
          space: item.space
            ? {
                id: item.space.id,
                name: item.space.name,
                slug: item.space.slug,
              }
            : undefined,
          sourceUrl: this.serializer.buildPageUrl(item),
          updatedAt: item.updatedAt,
        };
      }),
    );
  }

  private async findVisibleParent(
    parentPageId: string | null | undefined,
    context: McpRequestContext,
  ): Promise<any | undefined> {
    if (!parentPageId) return undefined;

    try {
      const parent = await this.pageRepo.findById(parentPageId, {
        includeSpace: true,
      });
      if (
        !parent ||
        parent.deletedAt ||
        parent.workspaceId !== context.workspace.id
      ) {
        return undefined;
      }
      this.assertTokenSpaceScope(parent.spaceId, context);
      await this.pageAccessService.validateCanView(parent, context.user);
      return parent;
    } catch {
      return undefined;
    }
  }

  private async findReadablePage(
    pageId: string,
    context: McpRequestContext,
  ): Promise<any> {
    const page = await this.pageRepo.findById(pageId, {
      includeContent: true,
      includeSpace: true,
    });

    if (!page || page.deletedAt || page.workspaceId !== context.workspace.id) {
      throw new NotFoundException('Page not found');
    }

    this.assertTokenSpaceScope(page.spaceId, context);
    await this.pageAccessService.validateCanView(page, context.user);
    return page;
  }

  private async assertVisibleSpace(
    spaceId: string | undefined,
    context: McpRequestContext,
  ) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    this.assertTokenSpaceScope(spaceId, context);
    const visibleSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(
      context.user.id,
    );
    if (!visibleSpaceIds.includes(spaceId)) {
      throw new ForbiddenException('MCP token cannot access this space');
    }
  }

  private assertTokenSpaceScope(
    spaceId: string,
    context: McpRequestContext,
  ): void {
    if (!this.isSpaceInTokenScope(spaceId, context)) {
      throw new ForbiddenException('MCP token cannot access this space');
    }
  }

  private isSpaceInTokenScope(
    spaceId: string | undefined,
    context: McpRequestContext,
  ): boolean {
    return (
      !context.token.allowedSpaceIds.length ||
      (Boolean(spaceId) && context.token.allowedSpaceIds.includes(spaceId))
    );
  }
}
