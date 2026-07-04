import api from "@/lib/api-client";
import { IPagination, QueryParams } from "@/lib/types";
import {
  ICreateMcpTokenRequest,
  IMcpConfig,
  IMcpToken,
  IRevokeMcpTokenRequest,
} from "@/ee/mcp/types/mcp-token.types";

export async function getMcpTokens(
  params?: QueryParams,
): Promise<IPagination<IMcpToken>> {
  const req = await api.post("/mcp-tokens", { ...params });
  return req.data;
}

export async function getMcpConfig(): Promise<IMcpConfig> {
  const req = await api.post("/mcp-tokens/config");
  return req.data;
}

export async function createMcpToken(
  data: ICreateMcpTokenRequest,
): Promise<IMcpToken> {
  const req = await api.post<IMcpToken>("/mcp-tokens/create", data);
  return req.data;
}

export async function revokeMcpToken(
  data: IRevokeMcpTokenRequest,
): Promise<void> {
  await api.post("/mcp-tokens/revoke", data);
}
