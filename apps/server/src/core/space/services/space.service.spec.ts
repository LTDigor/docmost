import { ForbiddenException } from '@nestjs/common';
import { SpaceService } from './space.service';
import { Feature } from '../../../common/features';

jest.mock(
  'src/integrations/queue/constants',
  () => ({
    QueueJob: {},
    QueueName: { ATTACHMENT_QUEUE: 'attachment' },
  }),
  { virtual: true },
);

const createDbMock = () => ({
  transaction: jest.fn().mockReturnValue({
    execute: jest.fn((callback) => callback({})),
  }),
});

const createSpaceService = () => {
  const spaceBefore = {
    id: 'space-1',
    name: 'Space',
    slug: 'space',
    description: null,
    settings: { sharing: { disabled: false } },
  };
  const spaceAfter = {
    ...spaceBefore,
    settings: { sharing: { disabled: true } },
  };

  const spaceRepo = {
    slugExists: jest.fn(),
    findById: jest.fn().mockResolvedValue(spaceBefore),
    updateSharingSettings: jest.fn(),
    updateSpace: jest.fn().mockResolvedValue(spaceAfter),
  };

  const workspaceRepo = {
    findById: jest.fn().mockResolvedValue({
      id: 'workspace-1',
      licenseKey: null,
      plan: null,
    }),
  };

  const licenseCheckService = {
    hasFeature: jest.fn().mockReturnValue(false),
  };

  const shareRepo = {
    deleteBySpaceId: jest.fn(),
  };

  const auditService = {
    log: jest.fn(),
  };

  const service = new SpaceService(
    spaceRepo as any,
    {} as any,
    shareRepo as any,
    workspaceRepo as any,
    licenseCheckService as any,
    createDbMock() as any,
    { add: jest.fn() } as any,
    auditService as any,
  );

  return {
    service,
    spaceRepo,
    workspaceRepo,
    licenseCheckService,
    shareRepo,
  };
};

describe('SpaceService', () => {
  it('allows disabling public sharing without a licensed security feature', async () => {
    const { service, spaceRepo, workspaceRepo, licenseCheckService, shareRepo } =
      createSpaceService();

    await service.updateSpace(
      { spaceId: 'space-1', disablePublicSharing: true } as any,
      'workspace-1',
    );

    expect(workspaceRepo.findById).not.toHaveBeenCalled();
    expect(licenseCheckService.hasFeature).not.toHaveBeenCalled();
    expect(spaceRepo.updateSharingSettings).toHaveBeenCalledWith(
      'space-1',
      'workspace-1',
      'disabled',
      true,
      {},
    );
    expect(shareRepo.deleteBySpaceId).toHaveBeenCalledWith('space-1', {});
  });

  it('keeps viewer comments license-gated', async () => {
    const { service, licenseCheckService } = createSpaceService();

    await expect(
      service.updateSpace(
        { spaceId: 'space-1', allowViewerComments: true } as any,
        'workspace-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(licenseCheckService.hasFeature).toHaveBeenCalledWith(
      null,
      Feature.VIEWER_COMMENTS,
      null,
    );
  });
});
