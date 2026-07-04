import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import CopyTextButton from "@/components/common/copy";
import { IMcpToken } from "@/ee/mcp/types/mcp-token.types";

type McpTokenCreatedModalProps = {
  opened: boolean;
  onClose: () => void;
  token: IMcpToken | null;
  endpoint: string;
};

export function McpTokenCreatedModal({
  opened,
  onClose,
  token,
  endpoint,
}: McpTokenCreatedModalProps) {
  const { t } = useTranslation();

  if (!token) return null;

  const headerValue = `Authorization: Bearer ${token.token}`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("{{credential}} created", { credential: t("MCP token") })}
      size="lg"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={t("Important")}
          color="red"
        >
          {t(
            "Copy this token now. It is shown only once and only works with the MCP endpoint.",
          )}
        </Alert>

        <div>
          <Text size="sm" fw={500} mb="xs">
            {t("MCP token")}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              variant="filled"
              style={{ flex: 1 }}
              value={token.token}
              readOnly
            />
            <CopyTextButton text={token.token} />
          </Group>
        </div>

        <div>
          <Text size="sm" fw={500} mb="xs">
            {t("Endpoint")}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              variant="filled"
              style={{ flex: 1 }}
              value={endpoint}
              readOnly
            />
            <CopyTextButton text={endpoint} />
          </Group>
        </div>

        <div>
          <Text size="sm" fw={500} mb="xs">
            {t("Header")}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              variant="filled"
              style={{ flex: 1 }}
              value={headerValue}
              readOnly
            />
            <CopyTextButton text={headerValue} />
          </Group>
        </div>

        <Button fullWidth onClick={onClose} mt="md">
          {t("I've saved my {{credential}}", { credential: t("MCP token") })}
        </Button>
      </Stack>
    </Modal>
  );
}
