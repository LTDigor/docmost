export const MCP_TOKEN_PREFIX = 'dcmcp_';

export const MCP_READONLY_TOOL_NAMES = [
  'search_pages',
  'get_page',
  'list_spaces',
  'list_child_pages',
  'get_relevant_context',
  'get_mcp_context',
] as const;

export type McpReadonlyToolName = (typeof MCP_READONLY_TOOL_NAMES)[number];
