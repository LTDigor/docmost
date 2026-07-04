import { IUser } from "@/features/user/types/user.types";

export interface IMcpToken {
  id: string;
  name: string;
  token?: string;
  tokenLastFour: string;
  creatorId: string;
  workspaceId: string;
  allowedSpaceIds: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  creator?: Partial<IUser>;
}

export interface ICreateMcpTokenRequest {
  name: string;
  expiresAt?: string;
  allowedSpaceIds?: string[];
}

export interface IRevokeMcpTokenRequest {
  tokenId: string;
}

export interface IMcpConfig {
  serverEnabled: boolean;
  workspaceEnabled: boolean;
  endpoint: string;
  rateLimitPerMinute: number;
  maxSearchResults: number;
  maxPageChars: number;
}
