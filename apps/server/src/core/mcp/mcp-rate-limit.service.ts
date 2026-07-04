import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '@nestjs-labs/nestjs-ioredis';
import type { Redis } from 'ioredis';
import { EnvironmentService } from '../../integrations/environment/environment.service';

const TTL_SECONDS = 60;

@Injectable()
export class McpRateLimitService {
  private readonly redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly environmentService: EnvironmentService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  async check(tokenId: string | undefined, ipAddress?: string): Promise<void> {
    const key = tokenId
      ? `mcp:rate:${tokenId}`
      : `mcp:rate:ip:${ipAddress || 'unknown'}`;

    const count = await this.redis.incr(key);
    await this.redis.expire(key, TTL_SECONDS, 'NX');

    if (count > this.environmentService.getMcpRateLimitPerMinute()) {
      throw new HttpException(
        'Too many MCP requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
