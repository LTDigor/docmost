import { McpTokenService } from './mcp-token.service';

describe('McpTokenService', () => {
  const service = new McpTokenService(
    {} as never,
    {
      getAppSecret: () => 'x'.repeat(32),
      isMcpServerEnabled: () => true,
    } as never,
    {} as never,
    {} as never,
  );

  it('generates opaque MCP-only tokens and stores only hashes', () => {
    const token = service.generateToken();
    const hash = service.hashToken(token);

    expect(token).toMatch(/^dcmcp_[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(service.getTokenLastFour(token)).toBe(token.slice(-4));
  });
});
