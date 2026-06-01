import type { ElementType } from "react";

export type SettingsNavigationItem = {
  label: string;
  icon: ElementType;
  path: string;
  feature?: string;
  role?: "admin" | "owner";
  env?: "cloud" | "selfhosted";
};

export type SettingsNavigationGroup = {
  heading: string;
  items: SettingsNavigationItem[];
};

export type SettingsNavigationContext = {
  isAdmin: boolean;
  isOwner: boolean;
  isMember: boolean;
  isCloud: boolean;
};

export function canShowSettingsNavigationItem(
  item: SettingsNavigationItem,
  context: SettingsNavigationContext,
) {
  if (item.env === "cloud" && !context.isCloud) return false;
  if (item.env === "selfhosted" && context.isCloud) return false;
  if (item.role === "admin" && !context.isAdmin) return false;
  if (item.role === "owner" && !context.isOwner) return false;
  return true;
}

export function filterSettingsNavigationGroups(
  groups: SettingsNavigationGroup[],
  context: SettingsNavigationContext,
) {
  return groups
    .filter((group) => {
      if (group.heading === "Workspace" && context.isMember) return false;
      if (group.heading === "System" && (!context.isAdmin || context.isCloud)) {
        return false;
      }
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canShowSettingsNavigationItem(item, context),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
