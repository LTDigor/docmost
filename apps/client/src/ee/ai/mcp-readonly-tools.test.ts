import { describe, expect, it } from "vitest";
import { MCP_READONLY_TOOLS } from "./mcp-tools";

describe("MCP readonly tool list", () => {
  it("contains only read-only tools shown in settings UI", () => {
    expect(MCP_READONLY_TOOLS).toEqual([
      "search_pages",
      "get_page",
      "list_spaces",
      "list_child_pages",
      "get_mcp_context",
    ]);

    expect(MCP_READONLY_TOOLS).not.toEqual(
      expect.arrayContaining([
        "create_page",
        "update_page",
        "duplicate_page",
        "move_page",
        "create_space",
        "update_space",
        "create_comment",
      ]),
    );
  });
});
