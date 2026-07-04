import { MCP_READONLY_TOOL_NAMES } from './mcp.constants';

describe('MCP readonly tools', () => {
  it('does not expose write-capable tools', () => {
    expect(MCP_READONLY_TOOL_NAMES).toEqual([
      'search_pages',
      'get_page',
      'list_spaces',
      'list_child_pages',
      'get_mcp_context',
    ]);

    expect(MCP_READONLY_TOOL_NAMES).not.toEqual(
      expect.arrayContaining([
        'create_page',
        'update_page',
        'delete_page',
        'move_page',
        'create_space',
        'update_space',
        'create_comment',
        'update_comment',
      ]),
    );
  });
});
