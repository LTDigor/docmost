import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../common/helpers/types/permission';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import { GroupController } from './group.controller';

describe('GroupController participant list authorization', () => {
  let controller: GroupController;
  let groupService: {
    getWorkspaceGroups: jest.Mock;
    getGroupInfo: jest.Mock;
  };
  let groupUserService: {
    getGroupUsers: jest.Mock;
  };

  const workspace = { id: 'workspace-1' } as any;
  const pagination = { limit: 10 } as any;

  beforeEach(() => {
    groupService = {
      getWorkspaceGroups: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      getGroupInfo: jest.fn().mockResolvedValue({ id: 'group-1' }),
    };
    groupUserService = {
      getGroupUsers: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };

    controller = new GroupController(
      groupService as any,
      groupUserService as any,
      new WorkspaceAbilityFactory(),
    );
  });

  it('returns groups for admins', async () => {
    await expect(
      controller.getWorkspaceGroups(
        pagination,
        { role: UserRole.ADMIN } as any,
        workspace,
      ),
    ).resolves.toEqual({ items: [], meta: {} });

    expect(groupService.getWorkspaceGroups).toHaveBeenCalledWith(
      workspace.id,
      pagination,
    );
  });

  it('throws ForbiddenException for members listing groups', async () => {
    expect(() =>
      controller.getWorkspaceGroups(
        pagination,
        { role: UserRole.MEMBER } as any,
        workspace,
      ),
    ).toThrow(ForbiddenException);

    expect(groupService.getWorkspaceGroups).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException for members reading group info', async () => {
    expect(() =>
      controller.getGroup(
        { groupId: 'group-1' } as any,
        { role: UserRole.MEMBER } as any,
        workspace,
      ),
    ).toThrow(ForbiddenException);

    expect(groupService.getGroupInfo).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException for members reading group members', async () => {
    expect(() =>
      controller.getGroupMembers(
        { groupId: 'group-1' } as any,
        pagination,
        { role: UserRole.MEMBER } as any,
        workspace,
      ),
    ).toThrow(ForbiddenException);

    expect(groupUserService.getGroupUsers).not.toHaveBeenCalled();
  });
});
