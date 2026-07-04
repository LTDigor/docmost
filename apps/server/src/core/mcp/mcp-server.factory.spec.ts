import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServerFactory } from './mcp-server.factory';
import { MCP_READONLY_TOOL_NAMES } from './mcp.constants';

jest.mock('./mcp-tool.service', () => ({
  McpToolService: class McpToolService {},
}));

describe('McpServerFactory', () => {
  it('initializes with only read-only tools', async () => {
    const toolService = {
      searchPages: jest.fn(),
      getPage: jest.fn(),
      listSpaces: jest.fn(),
      listChildPages: jest.fn(),
      getContext: jest.fn(),
    };
    const factory = new McpServerFactory(toolService as any);
    const server = factory.createServer({} as any);
    const client = new Client({ name: 'docmost-test', version: '1.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual([...MCP_READONLY_TOOL_NAMES].sort());
    expect(tools.tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(
      true,
    );
    expect(
      tools.tools.every((tool) => tool.annotations?.destructiveHint === false),
    ).toBe(true);

    await client.close();
    await server.close();
  });
});
