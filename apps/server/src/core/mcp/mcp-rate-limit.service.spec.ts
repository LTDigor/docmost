import { HttpStatus } from '@nestjs/common';
import { McpRateLimitService } from './mcp-rate-limit.service';

describe('McpRateLimitService', () => {
  it('limits by token id and IP fallback', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(61),
      expire: jest.fn().mockResolvedValue(undefined),
    };
    const service = new McpRateLimitService(
      { getOrThrow: () => redis } as never,
      { getMcpRateLimitPerMinute: () => 60 } as never,
    );

    await expect(
      service.check('token-1', '127.0.0.1'),
    ).resolves.toBeUndefined();
    await expect(service.check(undefined, '127.0.0.1')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(redis.incr).toHaveBeenNthCalledWith(1, 'mcp:rate:token-1');
    expect(redis.incr).toHaveBeenNthCalledWith(2, 'mcp:rate:ip:127.0.0.1');
  });
});
