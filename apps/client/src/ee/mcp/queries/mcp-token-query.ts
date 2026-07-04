import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IPagination, QueryParams } from "@/lib/types";
import {
  ICreateMcpTokenRequest,
  IMcpConfig,
  IMcpToken,
  IRevokeMcpTokenRequest,
} from "@/ee/mcp/types/mcp-token.types";
import {
  createMcpToken,
  getMcpConfig,
  getMcpTokens,
  revokeMcpToken,
} from "@/ee/mcp/services/mcp-token-service";

export function useGetMcpTokensQuery(
  params?: QueryParams,
): UseQueryResult<IPagination<IMcpToken>, Error> {
  return useQuery({
    queryKey: ["mcp-token-list", params],
    queryFn: () => getMcpTokens(params),
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useMcpConfigQuery(): UseQueryResult<IMcpConfig, Error> {
  return useQuery({
    queryKey: ["mcp-config"],
    queryFn: getMcpConfig,
  });
}

export function useCreateMcpTokenMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<IMcpToken, Error, ICreateMcpTokenRequest>({
    mutationFn: createMcpToken,
    onSuccess: () => {
      notifications.show({
        message: t("{{credential}} created successfully", {
          credential: t("MCP token"),
        }),
      });
      queryClient.invalidateQueries({
        predicate: (item) =>
          ["mcp-token-list"].includes(item.queryKey[0] as string),
      });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({ message: errorMessage, color: "red" });
    },
  });
}

export function useRevokeMcpTokenMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, IRevokeMcpTokenRequest>({
    mutationFn: revokeMcpToken,
    onSuccess: () => {
      notifications.show({ message: t("Revoked successfully") });
      queryClient.invalidateQueries({
        predicate: (item) =>
          ["mcp-token-list"].includes(item.queryKey[0] as string),
      });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({ message: errorMessage, color: "red" });
    },
  });
}
