import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/helpers/types/permission';
import WorkspaceAbilityFactory from '../../casl/abilities/workspace-ability.factory';

jest.mock('../services/workspace.service', () => ({
  WorkspaceService: class WorkspaceService {},
}));

jest.mock('../services/workspace-invitation.service', () => ({
  WorkspaceInvitationService: class WorkspaceInvitationService {},
}));

import { WorkspaceController } from './workspace.controller';

describe('WorkspaceController participant list authorization', () => {
  let controller: WorkspaceController;
  let workspaceService: { getWorkspaceUsers: jest.Mock };
  let workspaceInvitationService: { getInvitations: jest.Mock };

  const workspace = { id: 'workspace-1' } as any;
  const pagination = { limit: 10 } as any;

  beforeEach(() => {
    workspaceService = {
      getWorkspaceUsers: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };
    workspaceInvitationService = {
      getInvitations: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };

    controller = new WorkspaceController(
      workspaceService as any,
      workspaceInvitationService as any,
      new WorkspaceAbilityFactory(),
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('returns workspace members for admins', async () => {
    await expect(
      controller.getWorkspaceMembers(
        pagination,
        { role: UserRole.ADMIN } as any,
        workspace,
      ),
    ).resolves.toEqual({ items: [], meta: {} });

    expect(workspaceService.getWorkspaceUsers).toHaveBeenCalledWith(
      workspace.id,
      pagination,
    );
  });

  it('throws ForbiddenException for members reading workspace members', async () => {
    await expect(
      controller.getWorkspaceMembers(
        pagination,
        { role: UserRole.MEMBER } as any,
        workspace,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(workspaceService.getWorkspaceUsers).not.toHaveBeenCalled();
  });

  it('returns invitations for admins', async () => {
    await expect(
      controller.getInvitations(
        { role: UserRole.ADMIN } as any,
        workspace,
        pagination,
      ),
    ).resolves.toEqual({ items: [], meta: {} });

    expect(workspaceInvitationService.getInvitations).toHaveBeenCalledWith(
      workspace.id,
      pagination,
    );
  });

  it('throws ForbiddenException for members reading invitations', async () => {
    await expect(
      controller.getInvitations(
        { role: UserRole.MEMBER } as any,
        workspace,
        pagination,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(workspaceInvitationService.getInvitations).not.toHaveBeenCalled();
  });
});
