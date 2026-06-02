import { ForbiddenException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { Feature } from '../../../common/features';

jest.mock(
  'src/integrations/queue/constants',
  () => ({
    QueueJob: {},
    QueueName: { ATTACHMENT_QUEUE: 'attachment' },
  }),
  { virtual: true },
);

const createDbMock = (workspaceRow = {
  id: 'workspace-1',
  licenseKey: null,
  plan: null,
  trashRetentionDays: 30,
}) => ({
  selectFrom: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    executeTakeFirst: jest.fn().mockResolvedValue(workspaceRow),
  }),
  transaction: jest.fn().mockReturnValue({
    execute: jest.fn((callback) => callback({})),
  }),
});

const createWorkspaceService = () => {
  const workspaceBefore = {
    id: 'workspace-1',
    settings: { sharing: { disabled: false } },
  };
  const workspaceAfter = {
    id: 'workspace-1',
    name: 'Workspace',
    settings: { sharing: { disabled: true } },
    licenseKey: null,
  };

  const workspaceRepo = {
    findById: jest
      .fn()
      .mockResolvedValueOnce(workspaceBefore)
      .mockResolvedValueOnce(workspaceAfter),
    updateSharingSettings: jest.fn(),
    updateWorkspace: jest.fn(),
  };

  const licenseCheckService = {
    hasFeature: jest.fn().mockReturnValue(false),
  };

  const shareRepo = {
    deleteByWorkspaceId: jest.fn(),
  };

  const auditService = {
    log: jest.fn(),
  };

  const service = new WorkspaceService(
    workspaceRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    licenseCheckService as any,
    shareRepo as any,
    {} as any,
    {} as any,
    createDbMock() as any,
    { add: jest.fn() } as any,
    { add: jest.fn() } as any,
    { add: jest.fn() } as any,
    auditService as any,
    {} as any,
  );

  return { service, workspaceRepo, licenseCheckService, shareRepo };
};

describe('WorkspaceService', () => {
  it('allows disabling public sharing without a licensed security feature', async () => {
    const { service, workspaceRepo, licenseCheckService, shareRepo } =
      createWorkspaceService();

    const result = await service.update(
      'workspace-1',
      { disablePublicSharing: true } as any,
    );

    expect(licenseCheckService.hasFeature).not.toHaveBeenCalled();
    expect(workspaceRepo.updateSharingSettings).toHaveBeenCalledWith(
      'workspace-1',
      'disabled',
      true,
      {},
    );
    expect(shareRepo.deleteByWorkspaceId).toHaveBeenCalledWith(
      'workspace-1',
      {},
    );
    expect(result).not.toHaveProperty('licenseKey');
  });

  it('keeps adjacent security settings license-gated', async () => {
    const { service, licenseCheckService } = createWorkspaceService();

    await expect(
      service.update('workspace-1', { restrictApiToAdmins: true } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(licenseCheckService.hasFeature).toHaveBeenCalledWith(
      null,
      Feature.SECURITY_SETTINGS,
      null,
    );
  });
});
