import { User, Workspace } from '@docmost/db/types/entity.types';

export type McpAccessTokenRecord = {
  id: string;
  name: string;
  tokenHash: string;
  tokenLastFour: string;
  creatorId: string;
  workspaceId: string;
  allowedSpaceIds: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type McpRequestContext = {
  token: McpAccessTokenRecord;
  user: User;
  workspace: Workspace;
  ipAddress?: string;
  userAgent?: string;
};

export type McpSafeToken = {
  id: string;
  name: string;
  token?: string;
  tokenLastFour: string;
  creatorId: string;
  workspaceId: string;
  allowedSpaceIds: string[];
  expiresAt: Date | string | null;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
  creator?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
};
