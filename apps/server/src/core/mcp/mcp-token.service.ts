import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHmac } from 'node:crypto';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { UserRole } from '../../common/helpers/types/permission';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { MCP_TOKEN_PREFIX } from './mcp.constants';
import { McpAuditService } from './mcp-audit.service';
import { McpAccessTokenRecord, McpSafeToken } from './mcp.types';

@Injectable()
export class McpTokenService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly environmentService: EnvironmentService,
    private readonly auditService: McpAuditService,
    private readonly spaceMemberRepo: SpaceMemberRepo,
  ) {}

  generateToken(): string {
    return `${MCP_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  }

  hashToken(token: string): string {
    return createHmac('sha256', this.environmentService.getAppSecret())
      .update(token)
      .digest('hex');
  }

  getTokenLastFour(token: string): string {
    return token.slice(-4);
  }

  async createToken(opts: {
    name: string;
    expiresAt?: string;
    allowedSpaceIds?: string[];
    user: User;
    workspace: Workspace;
    ipAddress?: string;
  }): Promise<McpSafeToken> {
    this.assertMcpCanBeManaged(opts.workspace);

    const allowedSpaceIds = await this.normalizeAllowedSpaceIds(
      opts.user.id,
      opts.allowedSpaceIds,
    );
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    const created = await this.db
      .insertInto('mcpAccessTokens')
      .values({
        name: opts.name.trim(),
        tokenHash,
        tokenLastFour: this.getTokenLastFour(token),
        creatorId: opts.user.id,
        workspaceId: opts.workspace.id,
        allowedSpaceIds: allowedSpaceIds.length ? allowedSpaceIds : null,
        expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.auditService.log({
      workspaceId: opts.workspace.id,
      actorId: opts.user.id,
      actorType: 'user',
      event: AuditEvent.MCP_TOKEN_CREATED,
      resourceType: AuditResource.MCP_TOKEN,
      resourceId: created.id,
      metadata: {
        name: created.name,
        tokenLastFour: created.tokenLastFour,
        allowedSpaceIds,
        expiresAt: created.expiresAt,
      },
      ipAddress: opts.ipAddress,
    });

    return { ...this.toSafeToken(created), token };
  }

  async listTokens(opts: {
    user: User;
    workspace: Workspace;
    adminView?: boolean;
    limit?: number;
  }) {
    const adminView = Boolean(opts.adminView);
    if (adminView && !this.isWorkspaceAdmin(opts.user)) {
      throw new ForbiddenException();
    }

    const limit = Math.min(Math.max(opts.limit || 50, 1), 100);
    let query = this.db
      .selectFrom('mcpAccessTokens')
      .leftJoin('users', 'users.id', 'mcpAccessTokens.creatorId')
      .select([
        'mcpAccessTokens.id',
        'mcpAccessTokens.name',
        'mcpAccessTokens.creatorId',
        'mcpAccessTokens.workspaceId',
        'mcpAccessTokens.allowedSpaceIds',
        'mcpAccessTokens.expiresAt',
        'mcpAccessTokens.lastUsedAt',
        'mcpAccessTokens.tokenLastFour',
        'mcpAccessTokens.createdAt',
        'users.name as creatorName',
        'users.email as creatorEmail',
        'users.avatarUrl as creatorAvatarUrl',
      ])
      .where('mcpAccessTokens.workspaceId', '=', opts.workspace.id)
      .where('mcpAccessTokens.deletedAt', 'is', null)
      .where('mcpAccessTokens.revokedAt', 'is', null)
      .orderBy('mcpAccessTokens.createdAt', 'desc')
      .limit(limit);

    if (!adminView) {
      query = query.where('mcpAccessTokens.creatorId', '=', opts.user.id);
    }

    const rows = await query.execute();

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        creatorId: row.creatorId,
        workspaceId: row.workspaceId,
        allowedSpaceIds: this.parseAllowedSpaceIds(row.allowedSpaceIds),
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt,
        tokenLastFour: row.tokenLastFour,
        createdAt: row.createdAt,
        creator: {
          id: row.creatorId,
          name: row.creatorName,
          email: row.creatorEmail,
          avatarUrl: row.creatorAvatarUrl,
        },
      })),
      meta: {
        limit,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    };
  }

  async revokeToken(opts: {
    tokenId: string;
    user: User;
    workspace: Workspace;
    ipAddress?: string;
  }): Promise<void> {
    const token = await this.db
      .selectFrom('mcpAccessTokens')
      .selectAll()
      .where('id', '=', opts.tokenId)
      .where('workspaceId', '=', opts.workspace.id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!token) {
      throw new NotFoundException('MCP token not found');
    }

    if (token.creatorId !== opts.user.id && !this.isWorkspaceAdmin(opts.user)) {
      throw new ForbiddenException();
    }

    await this.db
      .updateTable('mcpAccessTokens')
      .set({
        revokedAt: new Date(),
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where('id', '=', opts.tokenId)
      .where('workspaceId', '=', opts.workspace.id)
      .execute();

    await this.auditService.log({
      workspaceId: opts.workspace.id,
      actorId: opts.user.id,
      actorType: 'user',
      event: AuditEvent.MCP_TOKEN_REVOKED,
      resourceType: AuditResource.MCP_TOKEN,
      resourceId: opts.tokenId,
      metadata: {
        tokenLastFour: token.tokenLastFour,
      },
      ipAddress: opts.ipAddress,
    });
  }

  async findActiveTokenByRawToken(
    rawToken: string,
    workspaceId?: string,
  ): Promise<McpAccessTokenRecord | undefined> {
    if (!rawToken?.startsWith(MCP_TOKEN_PREFIX)) {
      return undefined;
    }

    let query = this.db
      .selectFrom('mcpAccessTokens')
      .selectAll()
      .where('tokenHash', '=', this.hashToken(rawToken))
      .where('deletedAt', 'is', null)
      .where('revokedAt', 'is', null);

    if (workspaceId) {
      query = query.where('workspaceId', '=', workspaceId);
    }

    const token = await query.executeTakeFirst();
    if (!token) return undefined;
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      return undefined;
    }

    return {
      ...token,
      allowedSpaceIds: this.parseAllowedSpaceIds(token.allowedSpaceIds),
    };
  }

  async touchLastUsed(tokenId: string): Promise<void> {
    await this.db
      .updateTable('mcpAccessTokens')
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', tokenId)
      .execute();
  }

  private toSafeToken(token: any): McpSafeToken {
    return {
      id: token.id,
      name: token.name,
      tokenLastFour: token.tokenLastFour,
      creatorId: token.creatorId,
      workspaceId: token.workspaceId,
      allowedSpaceIds: this.parseAllowedSpaceIds(token.allowedSpaceIds),
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
    };
  }

  private assertMcpCanBeManaged(workspace: Workspace): void {
    if (!this.environmentService.isMcpServerEnabled()) {
      throw new ForbiddenException('MCP is disabled by server configuration');
    }

    const settings = (workspace.settings ?? {}) as Record<string, any>;
    if (settings?.ai?.mcp !== true) {
      throw new ForbiddenException('MCP is disabled for this workspace');
    }
  }

  private async normalizeAllowedSpaceIds(
    userId: string,
    allowedSpaceIds?: string[],
  ): Promise<string[]> {
    const uniqueIds = [...new Set((allowedSpaceIds ?? []).filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const visibleSpaceIds = new Set(
      await this.spaceMemberRepo.getUserSpaceIds(userId),
    );
    const invalid = uniqueIds.filter((id) => !visibleSpaceIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        'MCP token scope includes inaccessible spaces',
      );
    }

    return uniqueIds;
  }

  private parseAllowedSpaceIds(value: unknown): string[] {
    return Array.isArray(value) ? (value as string[]) : [];
  }

  private isWorkspaceAdmin(user: User): boolean {
    return user.role === UserRole.OWNER || user.role === UserRole.ADMIN;
  }
}
