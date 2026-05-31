import { UserRole } from '../../../common/helpers/types/permission';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../interfaces/workspace-ability.type';
import WorkspaceAbilityFactory from './workspace-ability.factory';

describe('WorkspaceAbilityFactory', () => {
  const factory = new WorkspaceAbilityFactory();
  const workspace = { id: 'workspace-1' } as any;

  it.each([UserRole.OWNER, UserRole.ADMIN])(
    'allows %s users to manage workspace members and groups',
    (role) => {
      const ability = factory.createForUser({ role } as any, workspace);

      expect(
        ability.can(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member),
      ).toBe(true);
      expect(
        ability.can(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Group),
      ).toBe(true);
    },
  );

  it('prevents member users from reading workspace members and groups', () => {
    const ability = factory.createForUser(
      { role: UserRole.MEMBER } as any,
      workspace,
    );

    expect(
      ability.can(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Member),
    ).toBe(false);
    expect(
      ability.can(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Group),
    ).toBe(false);
  });

  it('keeps non-admin member capabilities that are not participant lists', () => {
    const ability = factory.createForUser(
      { role: UserRole.MEMBER } as any,
      workspace,
    );

    expect(
      ability.can(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Space),
    ).toBe(true);
    expect(
      ability.can(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Attachment),
    ).toBe(true);
    expect(
      ability.can(WorkspaceCaslAction.Create, WorkspaceCaslSubject.API),
    ).toBe(true);
  });
});
