import { useState } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { IMcpToken } from "@/ee/mcp/types/mcp-token.types";
import {
  useGetMcpTokensQuery,
  useMcpConfigQuery,
} from "@/ee/mcp/queries/mcp-token-query";
import { McpTokenTable } from "@/ee/mcp/components/mcp-token-table";
import { CreateMcpTokenModal } from "@/ee/mcp/components/create-mcp-token-modal";
import { McpTokenCreatedModal } from "@/ee/mcp/components/mcp-token-created-modal";
import { RevokeMcpTokenModal } from "@/ee/mcp/components/revoke-mcp-token-modal";

type McpTokenManagerProps = {
  adminView?: boolean;
  disabled?: boolean;
};

export function McpTokenManager({
  adminView = false,
  disabled = false,
}: McpTokenManagerProps) {
  const { t } = useTranslation();
  const [createOpened, setCreateOpened] = useState(false);
  const [createdToken, setCreatedToken] = useState<IMcpToken | null>(null);
  const [revokeOpened, setRevokeOpened] = useState(false);
  const [selectedToken, setSelectedToken] = useState<IMcpToken | null>(null);
  const { data } = useGetMcpTokensQuery({ adminView });
  const { data: config } = useMcpConfigQuery();

  const canCreate =
    !disabled && config?.serverEnabled && config?.workspaceEnabled;

  const handleRevoke = (token: IMcpToken) => {
    setSelectedToken(token);
    setRevokeOpened(true);
  };

  return (
    <Stack gap="md">
      {!canCreate && (
        <Alert icon={<IconInfoCircle />} color="yellow" variant="light">
          <Text size="sm">
            {t(
              "MCP token creation is disabled until server and workspace MCP are enabled.",
            )}
          </Text>
        </Alert>
      )}

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t("MCP tokens are read-only and only work with the /mcp endpoint.")}
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateOpened(true)}
          disabled={!canCreate}
        >
          {t("Create MCP token")}
        </Button>
      </Group>

      <McpTokenTable
        tokens={data?.items || []}
        showUserColumn={adminView}
        onRevoke={handleRevoke}
      />

      <CreateMcpTokenModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        onSuccess={(token) => setCreatedToken(token)}
      />

      <McpTokenCreatedModal
        opened={!!createdToken}
        onClose={() => setCreatedToken(null)}
        token={createdToken}
        endpoint={config?.endpoint || `${window.location.origin}/mcp`}
      />

      <RevokeMcpTokenModal
        opened={revokeOpened}
        onClose={() => {
          setRevokeOpened(false);
          setSelectedToken(null);
        }}
        token={selectedToken}
      />
    </Stack>
  );
}
