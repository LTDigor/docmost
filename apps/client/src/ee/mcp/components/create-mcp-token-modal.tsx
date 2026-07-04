import { lazy, Suspense, useState } from "react";
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCalendar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { IMcpToken } from "@/ee/mcp/types/mcp-token.types";
import { useCreateMcpTokenMutation } from "@/ee/mcp/queries/mcp-token-query";

const DateInput = lazy(() =>
  import("@mantine/dates").then((module) => ({
    default: module.DateInput,
  })),
);

type CreateMcpTokenModalProps = {
  opened: boolean;
  onClose: () => void;
  onSuccess: (token: IMcpToken) => void;
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  expiresAt: z.string().optional(),
  allowedSpaceIds: z.array(z.string()).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function CreateMcpTokenModal({
  opened,
  onClose,
  onSuccess,
}: CreateMcpTokenModalProps) {
  const { t, i18n } = useTranslation();
  const [expirationOption, setExpirationOption] = useState<string>("30");
  const createMutation = useCreateMcpTokenMutation();
  const { data: spaces } = useGetSpacesQuery({ limit: 100 });

  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: {
      name: "",
      expiresAt: "",
      allowedSpaceIds: [],
    },
  });

  const getExpirationDate = (): string | undefined => {
    if (expirationOption === "never") return undefined;
    if (expirationOption === "custom") return form.values.expiresAt;
    const days = parseInt(expirationOption);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const getExpirationLabel = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const formatted = date.toLocaleDateString(i18n.language, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    return `${days} days (${formatted})`;
  };

  const expirationOptions = [
    { value: "30", label: getExpirationLabel(30) },
    { value: "60", label: getExpirationLabel(60) },
    { value: "90", label: getExpirationLabel(90) },
    { value: "365", label: getExpirationLabel(365) },
    { value: "custom", label: t("Custom") },
    { value: "never", label: t("No expiration") },
  ];

  const handleSubmit = async (values: FormValues) => {
    const token = await createMutation.mutateAsync({
      name: values.name,
      expiresAt: getExpirationDate(),
      allowedSpaceIds: values.allowedSpaceIds?.length
        ? values.allowedSpaceIds
        : undefined,
    });
    onSuccess(token);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    setExpirationOption("30");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("Create {{credential}}", { credential: t("MCP token") })}
      size="md"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("Name")}
            placeholder={t("Enter a descriptive name")}
            data-autofocus
            required
            {...form.getInputProps("name")}
          />

          <MultiSelect
            label={t("Space scope")}
            placeholder={t("All visible spaces")}
            data={(spaces?.items || []).map((space) => ({
              value: space.id,
              label: space.name,
            }))}
            searchable
            clearable
            {...form.getInputProps("allowedSpaceIds")}
          />

          <Select
            label={t("Expiration")}
            data={expirationOptions}
            value={expirationOption}
            onChange={(value) => setExpirationOption(value || "30")}
            leftSection={<IconCalendar size={16} />}
            allowDeselect={false}
          />

          {expirationOption === "custom" && (
            <Suspense fallback={null}>
              <DateInput
                label={t("Custom expiration date")}
                placeholder={t("Select expiration date")}
                minDate={new Date()}
                {...form.getInputProps("expiresAt")}
              />
            </Suspense>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              {t("Create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
