import { Module } from '@nestjs/common';
import { PageModule } from '../page/page.module';
import { SearchModule } from '../search/search.module';
import { SpaceModule } from '../space/space.module';
import { McpAuditService } from './mcp-audit.service';
import { McpAuthService } from './mcp-auth.service';
import { McpController } from './mcp.controller';
import { McpRateLimitService } from './mcp-rate-limit.service';
import { McpServerFactory } from './mcp-server.factory';
import { McpTextSerializer } from './mcp-text-serializer';
import { McpTokenController } from './mcp-token.controller';
import { McpTokenService } from './mcp-token.service';
import { McpToolService } from './mcp-tool.service';

@Module({
  imports: [PageModule, SearchModule, SpaceModule],
  controllers: [McpController, McpTokenController],
  providers: [
    McpAuditService,
    McpAuthService,
    McpRateLimitService,
    McpServerFactory,
    McpTextSerializer,
    McpTokenService,
    McpToolService,
  ],
})
export class McpModule {}
