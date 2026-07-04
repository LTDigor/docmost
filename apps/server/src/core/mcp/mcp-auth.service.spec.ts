import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuditEvent } from '../../common/events/audit-events';
import { McpAuthService } from './mcp-auth.service';

describe('McpAuthService', () => {
  const token = {
    id: 'token-1',
    name: 'Agent',
    creatorId: 'user-1',
    workspaceId: 'workspace-1',
    allowedSpaceIds: [],
  };
  const workspace = {
    id: 'workspace-1',
    name: 'OfferCore',
    settings: { ai: { mcp: true } },
  };
  const user = {
    id: 'user-1',
    name: 'Anna',
    deactivatedAt: null,
    deletedAt: null,
  };

  function makeService(
    overrides: {
      enabled?: boolean;
      foundToken?: any;
      foundWorkspace?: any;
      foundUser?: any;
    } = {},
  ) {
    const tokenService = {
      findActiveTokenByRawToken: jest
        .fn()
        .mockResolvedValue(
          Object.prototype.hasOwnProperty.call(overrides, 'foundToken')
            ? overrides.foundToken
            : token,
        ),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    };
    const userRepo = {
      findById: jest
        .fn()
        .mockResolvedValue(
          overrides.foundUser === undefined ? user : overrides.foundUser,
        ),
    };
    const workspaceRepo = {
      findById: jest
        .fn()
        .mockResolvedValue(
          overrides.foundWorkspace === undefined
            ? workspace
            : overrides.foundWorkspace,
        ),
    };
    const environmentService = {
      isMcpServerEnabled: () => overrides.enabled ?? true,
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const service = new McpAuthService(
      tokenService as never,
      userRepo as never,
      workspaceRepo as never,
      environmentService as never,
      auditService as never,
    );

    return { service, tokenService, userRepo, workspaceRepo, auditService };
  }

  it('rejects when server MCP is disabled', async () => {
    const { service, auditService } = makeService({ enabled: false });

    await expect(
      service.authenticate({ rawToken: 'dcmcp_x', workspaceId: 'workspace-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.MCP_AUTH_FAILED,
        metadata: { reason: 'server_disabled' },
      }),
    );
  });

  it('rejects missing and invalid tokens with 401 errors', async () => {
    const missing = makeService();
    await expect(missing.service.authenticate({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const invalid = makeService({ foundToken: null });
    await expect(
      invalid.service.authenticate({
        rawToken: 'dcmcp_invalid',
        workspaceId: 'workspace-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when workspace MCP is disabled', async () => {
    const { service } = makeService({
      foundWorkspace: {
        ...workspace,
        settings: { ai: { mcp: false } },
      },
    });

    await expect(
      service.authenticate({ rawToken: 'dcmcp_x', workspaceId: 'workspace-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects disabled users', async () => {
    const { service } = makeService({
      foundUser: { ...user, deactivatedAt: new Date() },
    });

    await expect(
      service.authenticate({ rawToken: 'dcmcp_x', workspaceId: 'workspace-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns context and touches last-used for valid tokens', async () => {
    const { service, tokenService } = makeService();

    const context = await service.authenticate({
      rawToken: 'dcmcp_valid',
      workspaceId: 'workspace-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(context).toEqual(
      expect.objectContaining({
        token,
        workspace,
        user,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    );
    expect(tokenService.touchLastUsed).toHaveBeenCalledWith('token-1');
  });
});
