import { Button, Group, Modal, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IMcpToken } from "@/ee/mcp/types/mcp-token.types";
import { useRevokeMcpTokenMutation } from "@/ee/mcp/queries/mcp-token-query";

type RevokeMcpTokenModalProps = {
  opened: boolean;
  onClose: () => void;
  token: IMcpToken | null;
};

export function RevokeMcpTokenModal({
  opened,
  onClose,
  token,
}: RevokeMcpTokenModalProps) {
  const { t } = useTranslation();
  const revokeMutation = useRevokeMcpTokenMutation();

  const handleRevoke = async () => {
    if (!token) return;
    await revokeMutation.mutateAsync({ tokenId: token.id });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Revoke {{credential}}", { credential: t("MCP token") })}
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <Text size="sm">
        {t(
          "This action cannot be undone. Any MCP clients using this token will stop working.",
        )}
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          color="red"
          onClick={handleRevoke}
          loading={revokeMutation.isPending}
        >
          {t("Revoke")}
        </Button>
      </Group>
    </Modal>
  );
}
