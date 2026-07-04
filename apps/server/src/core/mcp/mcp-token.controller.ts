import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import {
  CreateMcpTokenDto,
  ListMcpTokensDto,
  RevokeMcpTokenDto,
} from './dto/mcp-token.dto';
import { McpTokenService } from './mcp-token.service';

@UseGuards(JwtAuthGuard)
@Controller('mcp-tokens')
export class McpTokenController {
  constructor(
    private readonly tokenService: McpTokenService,
    private readonly environmentService: EnvironmentService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  list(
    @Body() dto: ListMcpTokensDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.tokenService.listTokens({
      user,
      workspace,
      adminView: dto.adminView,
      limit: dto.limit,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('config')
  config(@AuthWorkspace() workspace: Workspace) {
    return {
      serverEnabled: this.environmentService.isMcpServerEnabled(),
      workspaceEnabled:
        ((workspace.settings ?? {}) as Record<string, any>)?.ai?.mcp === true,
      endpoint: `${this.environmentService.getAppUrl()}/mcp`,
      rateLimitPerMinute: this.environmentService.getMcpRateLimitPerMinute(),
      maxSearchResults: this.environmentService.getMcpMaxSearchResults(),
      maxPageChars: this.environmentService.getMcpMaxPageChars(),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @Body() dto: CreateMcpTokenDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Req() req: FastifyRequest,
  ) {
    return this.tokenService.createToken({
      name: dto.name,
      expiresAt: dto.expiresAt,
      allowedSpaceIds: dto.allowedSpaceIds,
      user,
      workspace,
      ipAddress: (req.raw as any).ip || req.ip,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  async revoke(
    @Body() dto: RevokeMcpTokenDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Req() req: FastifyRequest,
  ) {
    await this.tokenService.revokeToken({
      tokenId: dto.tokenId,
      user,
      workspace,
      ipAddress: (req.raw as any).ip || req.ip,
    });
  }
}
