jest.mock(
  'src/collaboration/collaboration.util',
  () => ({
    jsonToNode: jest.fn(),
    jsonToMarkdown: jest.fn(),
  }),
  { virtual: true },
);
jest.mock('../page/services/page.service', () => ({
  PageService: class PageService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditEvent } from '../../common/events/audit-events';
import { McpTextSerializer } from './mcp-text-serializer';
import { McpToolService } from './mcp-tool.service';

describe('McpToolService', () => {
  const context = {
    workspace: { id: 'workspace-1', name: 'OfferCore' },
    user: { id: 'user-1', name: 'Anna' },
    token: {
      id: 'token-1',
      name: 'Job agent',
      allowedSpaceIds: ['space-1'],
    },
    ipAddress: '127.0.0.1',
  } as any;

  function makeService(overrides: Record<string, any> = {}) {
    const searchService = {
      searchPage: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'page-1',
            slugId: 'abc123',
            title: 'Employment guide',
            highlight: '<b>Interview</b> steps',
            updatedAt: '2026-07-01T00:00:00.000Z',
            space: { id: 'space-1', name: 'HR', slug: 'hr' },
          },
          {
            id: 'page-2',
            slugId: 'def456',
            title: 'Hidden guide',
            highlight: 'Hidden',
            updatedAt: '2026-07-02T00:00:00.000Z',
            space: { id: 'space-2', name: 'Private', slug: 'private' },
          },
        ],
      }),
    };
    const pageRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'page-1',
        title: 'Employment guide',
        slugId: 'abc123',
        spaceId: 'space-1',
        workspaceId: 'workspace-1',
        deletedAt: null,
        updatedAt: '2026-07-01T00:00:00.000Z',
        content: '## Steps\n\n- Prepare CV',
        space: { id: 'space-1', name: 'HR', slug: 'hr' },
      }),
    };
    const pageAccessService = {
      validateCanView: jest.fn().mockResolvedValue(undefined),
    };
    const pageService = {
      getSidebarPages: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'child-1',
            slugId: 'child123',
            title: 'Child',
            parentPageId: null,
            hasChildren: false,
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      }),
    };
    const spaceMemberRepo = {
      getUserSpaceIds: jest.fn().mockResolvedValue(['space-1']),
      getUserSpaces: jest.fn().mockResolvedValue({
        items: [
          { id: 'space-1', name: 'HR', slug: 'hr' },
          { id: 'space-2', name: 'Private', slug: 'private' },
        ],
      }),
    };
    const spaceRepo = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'space-1', name: 'HR', slug: 'hr' }),
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const environmentService = {
      getAppUrl: () => 'https://docmost.offercore.ru',
      getMcpMaxSearchResults: () => 10,
      getMcpMaxPageChars: () => 80_000,
    };
    const serializer = new McpTextSerializer(environmentService as never);

    const service = new McpToolService(
      overrides.searchService ?? (searchService as never),
      overrides.pageRepo ?? (pageRepo as never),
      overrides.pageAccessService ?? (pageAccessService as never),
      overrides.pageService ?? (pageService as never),
      overrides.spaceMemberRepo ?? (spaceMemberRepo as never),
      overrides.spaceRepo ?? (spaceRepo as never),
      serializer,
      overrides.auditService ?? (auditService as never),
      overrides.environmentService ?? (environmentService as never),
    );

    return {
      service,
      searchService,
      pageRepo,
      pageAccessService,
      pageService,
      spaceMemberRepo,
      auditService,
    };
  }

  function textOf(result: any): string {
    return result.content[0].text;
  }

  it('searches visible pages, strips HTML excerpts, and applies token space scope', async () => {
    const { service, auditService } = makeService();

    const result = await service.searchPages(
      { query: 'interview', limit: 10 },
      context,
    );

    expect(result.structuredContent.items).toEqual([
      expect.objectContaining({
        pageId: 'page-1',
        excerpt: 'Interview steps',
        sourceUrl: 'https://docmost.offercore.ru/s/hr/p/abc123',
      }),
    ]);
    expect(textOf(result)).toContain('Employment guide');
    expect(textOf(result)).not.toContain('<b>');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.MCP_SEARCH,
        metadata: expect.objectContaining({ resultCount: 1 }),
      }),
    );
  });

  it('reads pages as clean markdown with source URL after access validation', async () => {
    const { service, pageAccessService, auditService } = makeService();

    const result = await service.getPage({ pageId: 'page-1' }, context);

    expect(pageAccessService.validateCanView).toHaveBeenCalled();
    expect(textOf(result)).toContain('# Employment guide');
    expect(textOf(result)).toContain(
      'Source: https://docmost.offercore.ru/s/hr/p/abc123',
    );
    expect(textOf(result)).toContain('- Prepare CV');
    expect(JSON.stringify(result.structuredContent)).not.toContain('"type"');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.MCP_PAGE_READ,
        resourceId: 'page-1',
      }),
    );
  });

  it('rejects pages outside token space scope before returning content', async () => {
    const pageRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'page-2',
        title: 'Hidden',
        slugId: 'hidden',
        spaceId: 'space-2',
        workspaceId: 'workspace-1',
        deletedAt: null,
        content: 'secret',
      }),
    };
    const { service, pageAccessService } = makeService({ pageRepo });

    await expect(
      service.getPage({ pageId: 'page-2' }, context),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(pageAccessService.validateCanView).not.toHaveBeenCalled();
  });

  it('lists only spaces allowed by token scope', async () => {
    const { service } = makeService();

    const result = await service.listSpaces(context);

    expect(result.structuredContent.items).toEqual([
      { id: 'space-1', name: 'HR', slug: 'hr' },
    ]);
  });

  it('lists child pages with source URLs and rejects empty selectors', async () => {
    const { service, pageService } = makeService();

    await expect(service.listChildPages({}, context)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const result = await service.listChildPages(
      { spaceId: 'space-1' },
      context,
    );

    expect(pageService.getSidebarPages).toHaveBeenCalledWith(
      'space-1',
      { limit: 10 },
      undefined,
      'user-1',
      false,
    );
    expect(result.structuredContent.items[0]).toEqual(
      expect.objectContaining({
        pageId: 'child-1',
        sourceUrl: 'https://docmost.offercore.ru/s/hr/p/child123',
      }),
    );
  });

  it('does not expose internal token id in MCP context output', () => {
    const { service } = makeService();

    const result = service.getContext(context);

    expect(result.structuredContent.token).toEqual({
      name: 'Job agent',
      allowedSpaceIds: ['space-1'],
    });
    expect(JSON.stringify(result.structuredContent)).not.toContain('token-1');
  });
});
