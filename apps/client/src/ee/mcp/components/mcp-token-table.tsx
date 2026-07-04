import { ActionIcon, Group, Menu, Table, Text } from "@mantine/core";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import React from "react";
import NoTableResults from "@/components/common/no-table-results";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import { IMcpToken } from "@/ee/mcp/types/mcp-token.types";

type McpTokenTableProps = {
  tokens: IMcpToken[];
  showUserColumn?: boolean;
  onRevoke?: (token: IMcpToken) => void;
};

export function McpTokenTable({
  tokens,
  showUserColumn = false,
  onRevoke,
}: McpTokenTableProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const formatDate = (date: string | null) => {
    if (!date) return t("Never");
    return formatLocalized(date, "MMM dd, yyyy", "PP", locale);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Table.ScrollContainer minWidth={560}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Name")}</Table.Th>
            {showUserColumn && <Table.Th>{t("User")}</Table.Th>}
            <Table.Th>{t("Scope")}</Table.Th>
            <Table.Th>{t("Last used")}</Table.Th>
            <Table.Th>{t("Expires")}</Table.Th>
            <Table.Th>{t("Created")}</Table.Th>
            <Table.Th aria-label={t("Action")} />
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {tokens?.length ? (
            tokens.map((token) => (
              <Table.Tr key={token.id}>
                <Table.Td>
                  <Text fz="sm" fw={500}>
                    {token.name}
                  </Text>
                  <Text fz="xs" c="dimmed" ff="monospace">
                    ****{token.tokenLastFour}
                  </Text>
                </Table.Td>

                {showUserColumn && (
                  <Table.Td>
                    {token.creator && (
                      <Group gap="4" wrap="nowrap">
                        <CustomAvatar
                          avatarUrl={token.creator?.avatarUrl}
                          name={token.creator.name}
                          size="sm"
                        />
                        <Text fz="sm" lineClamp={1}>
                          {token.creator.name}
                        </Text>
                      </Group>
                    )}
                  </Table.Td>
                )}

                <Table.Td>
                  <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
                    {token.allowedSpaceIds?.length
                      ? t("{{count}} spaces", {
                          count: token.allowedSpaceIds.length,
                        })
                      : t("All visible spaces")}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(token.lastUsedAt)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
                    {isExpired(token.expiresAt)
                      ? t("Expired")
                      : formatDate(token.expiresAt)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(token.createdAt)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label={t("MCP token menu")}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {onRevoke && (
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={() => onRevoke(token)}
                        >
                          {t("Revoke")}
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))
          ) : (
            <NoTableResults colSpan={showUserColumn ? 7 : 6} />
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
