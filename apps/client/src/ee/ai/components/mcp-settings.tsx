import {
  Anchor,
  Divider,
  Group,
  List,
  Text,
  Switch,
  TextInput,
  ActionIcon,
  Tooltip,
  Stack,
  Alert,
} from "@mantine/core";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { updateWorkspace } from "@/features/workspace/services/workspace-service.ts";
import { notifications } from "@mantine/notifications";
import { getAppUrl } from "@/lib/config.ts";
import { IconCheck, IconCopy, IconInfoCircle } from "@tabler/icons-react";
import { CopyButton } from "@/components/common/copy-button.tsx";
import { MCP_READONLY_TOOLS } from "@/ee/ai/mcp-tools";
import { McpTokenManager } from "@/ee/mcp/components/mcp-token-manager";
import { useMcpConfigQuery } from "@/ee/mcp/queries/mcp-token-query";
import { useQueryClient } from "@tanstack/react-query";

export default function McpSettings() {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const [checked, setChecked] = useState(Boolean(workspace?.settings?.ai?.mcp));
  const queryClient = useQueryClient();
  const { data: config } = useMcpConfigQuery();

  const mcpUrl = config?.endpoint || `${getAppUrl()}/mcp`;
  const serverEnabled = config?.serverEnabled ?? false;

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.checked;
    try {
      const updatedWorkspace = await updateWorkspace({ mcpEnabled: value });
      setChecked(value);
      setWorkspace(updatedWorkspace);
      queryClient.invalidateQueries({ queryKey: ["mcp-config"] });
    } catch (err) {
      notifications.show({
        message: err?.response?.data?.message,
        color: "red",
      });
    }
  };

  return (
    <Stack gap="lg">
      {!serverEnabled && (
        <Alert
          icon={<IconInfoCircle />}
          title={t("MCP disabled by server config")}
          color="yellow"
        >
          {t(
            "Set MCP_SERVER_ENABLED=true on the server before workspace MCP tokens can be used.",
          )}
        </Alert>
      )}

      <Group justify="space-between" wrap="nowrap" gap="xl">
        <div>
          <Text size="md">{t("Model Context Protocol (MCP)")}</Text>
          <Text size="sm" c="dimmed">
            {t(
              "Enable read-only MCP access for external AI agents to use visible workspace pages as context.",
            )}{" "}
            <Trans
              i18nKey="View the <anchor>MCP documentation</anchor>."
              components={{
                anchor: (
                  <Anchor
                    href="https://docmost.com/docs/user-guide/mcp"
                    target="_blank"
                    size="sm"
                  />
                ),
              }}
            />
          </Text>
        </div>

        <Tooltip
          label={t("MCP is disabled by server config")}
          disabled={serverEnabled}
          refProp="rootRef"
        >
          <Switch
            checked={checked}
            onChange={handleChange}
            disabled={!serverEnabled}
          />
        </Tooltip>
      </Group>

      {checked && (
        <div>
          <Text size="sm" fw={500} mb={4}>
            {t("MCP Server URL")}
          </Text>
          <Group gap="xs">
            <TextInput value={mcpUrl} readOnly style={{ flex: 1 }} />
            <CopyButton value={mcpUrl} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? t("Copied") : t("Copy")}
                  withArrow
                  position="right"
                >
                  <ActionIcon
                    color={copied ? "teal" : "gray"}
                    variant="subtle"
                    onClick={copy}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          <Text size="sm" c="dimmed" mt="xs">
            {t(
              "Use a dedicated MCP token for authentication. Normal API keys and browser sessions are not accepted by this endpoint.",
            )}
          </Text>

          <Text size="sm" fw={500} mt="md" mb={4}>
            {t("Client auth header")}
          </Text>
          <TextInput
            value="Authorization: Bearer <MCP token>"
            readOnly
            style={{ flex: 1 }}
          />

          <div>
            <Text size="sm" fw={500} mt="md" mb={4}>
              {t("Read-only tools")}
            </Text>
            <List size="sm" spacing={2}>
              {MCP_READONLY_TOOLS.map((tool) => (
                <List.Item key={tool}>
                  <Text size="sm" c="dimmed" span ff="monospace">
                    {tool}
                  </Text>
                </List.Item>
              ))}
            </List>
          </div>

          <Divider my="lg" />

          <Text size="md" mb="xs">
            {t("MCP tokens")}
          </Text>
          <McpTokenManager adminView disabled={!serverEnabled || !checked} />
        </div>
      )}
    </Stack>
  );
}
