import { describe, expect, it } from "vitest";
import {
  filterSettingsNavigationGroups,
  type SettingsNavigationGroup,
} from "./settings-navigation";

const Icon = () => null;

const groups: SettingsNavigationGroup[] = [
  {
    heading: "Account",
    items: [{ label: "Profile", icon: Icon, path: "/settings/account/profile" }],
  },
  {
    heading: "Workspace",
    items: [
      { label: "General", icon: Icon, path: "/settings/workspace" },
      { label: "Members", icon: Icon, path: "/settings/members" },
      { label: "AI settings", icon: Icon, path: "/settings/ai", role: "admin" },
    ],
  },
  {
    heading: "System",
    items: [{ label: "License", icon: Icon, path: "/settings/license" }],
  },
];

describe("filterSettingsNavigationGroups", () => {
  it("keeps account settings and hides the workspace group for members", () => {
    const visibleGroups = filterSettingsNavigationGroups(groups, {
      isAdmin: false,
      isOwner: false,
      isMember: true,
      isCloud: false,
    });

    expect(visibleGroups.map((group) => group.heading)).toEqual(["Account"]);
  });

  it("shows workspace settings for admins", () => {
    const visibleGroups = filterSettingsNavigationGroups(groups, {
      isAdmin: true,
      isOwner: false,
      isMember: false,
      isCloud: false,
    });

    expect(visibleGroups.map((group) => group.heading)).toEqual([
      "Account",
      "Workspace",
      "System",
    ]);
    expect(visibleGroups[1].items.map((item) => item.label)).toEqual([
      "General",
      "Members",
      "AI settings",
    ]);
  });

  it("shows owner-only workspace settings to owners", () => {
    const visibleGroups = filterSettingsNavigationGroups(groups, {
      isAdmin: true,
      isOwner: true,
      isMember: false,
      isCloud: false,
    });

    expect(visibleGroups.some((group) => group.heading === "Workspace")).toBe(
      true,
    );
  });
});
