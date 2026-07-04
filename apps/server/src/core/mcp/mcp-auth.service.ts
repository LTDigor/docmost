import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { isUserDisabled } from '../../common/helpers';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { McpAuditService } from './mcp-audit.service';
import { McpTokenService } from './mcp-token.service';
import { McpRequestContext } from './mcp.types';

@Injectable()
export class McpAuthService {
  constructor(
    private readonly tokenService: McpTokenService,
    private readonly userRepo: UserRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly environmentService: EnvironmentService,
    private readonly auditService: McpAuditService,
  ) {}

  async authenticate(opts: {
    rawToken?: string;
    workspaceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<McpRequestContext> {
    if (!this.environmentService.isMcpServerEnabled()) {
      await this.logAuthFailure(opts, 'server_disabled');
      throw new ForbiddenException('MCP is disabled by server configuration');
    }

    if (!opts.rawToken) {
      await this.logAuthFailure(opts, 'missing_token');
      throw new UnauthorizedException('Missing MCP bearer token');
    }

    const token = await this.tokenService.findActiveTokenByRawToken(
      opts.rawToken,
      opts.workspaceId,
    );
    if (!token) {
      await this.logAuthFailure(opts, 'invalid_token');
      throw new UnauthorizedException('Invalid MCP bearer token');
    }

    const workspace = await this.workspaceRepo.findById(token.workspaceId);
    if (!workspace) {
      await this.logAuthFailure(opts, 'workspace_missing');
      throw new UnauthorizedException('Invalid MCP workspace');
    }

    const settings = (workspace.settings ?? {}) as Record<string, any>;
    if (settings?.ai?.mcp !== true) {
      await this.logAuthFailure(
        { ...opts, workspaceId: workspace.id },
        'workspace_disabled',
      );
      throw new ForbiddenException('MCP is disabled for this workspace');
    }

    const user = await this.userRepo.findById(
      token.creatorId,
      token.workspaceId,
    );
    if (!user || isUserDisabled(user)) {
      await this.logAuthFailure(
        { ...opts, workspaceId: workspace.id },
        'user_disabled',
      );
      throw new UnauthorizedException('Invalid MCP user');
    }

    void this.tokenService.touchLastUsed(token.id);

    return {
      token,
      workspace,
      user,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    };
  }

  private async logAuthFailure(
    opts: { workspaceId?: string; ipAddress?: string },
    reason: string,
  ) {
    await this.auditService.log({
      workspaceId: opts.workspaceId,
      actorType: 'mcp_token',
      event: AuditEvent.MCP_AUTH_FAILED,
      resourceType: AuditResource.MCP_TOKEN,
      metadata: { reason },
      ipAddress: opts.ipAddress,
    });
  }
}
