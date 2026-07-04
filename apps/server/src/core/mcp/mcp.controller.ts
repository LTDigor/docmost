import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { extractBearerTokenFromHeader } from '../../common/helpers';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { McpAuditService } from './mcp-audit.service';
import { McpAuthService } from './mcp-auth.service';
import { McpRateLimitService } from './mcp-rate-limit.service';
import { McpServerFactory } from './mcp-server.factory';
import { McpRequestContext } from './mcp.types';

@Public()
@Controller('mcp')
export class McpController {
  constructor(
    private readonly authService: McpAuthService,
    private readonly rateLimitService: McpRateLimitService,
    private readonly serverFactory: McpServerFactory,
    private readonly auditService: McpAuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  async handleMcp(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const rawToken = extractBearerTokenFromHeader(req);
    const ipAddress = (req.raw as any).ip || req.ip;
    let context: McpRequestContext | undefined;

    try {
      await this.rateLimitService.check(undefined, ipAddress);

      context = await this.authService.authenticate({
        rawToken,
        workspaceId: (req.raw as any).workspaceId,
        ipAddress,
        userAgent: req.headers['user-agent'],
      });

      await this.rateLimitService.check(context.token.id, ipAddress);
    } catch (err) {
      if (
        err instanceof HttpException &&
        err.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        await this.auditService.log({
          workspaceId: context?.workspace.id ?? (req.raw as any).workspaceId,
          actorId: context?.token.id,
          actorType: 'mcp_token',
          event: AuditEvent.MCP_RATE_LIMITED,
          resourceType: AuditResource.MCP_TOKEN,
          resourceId: context?.token.id,
          ipAddress,
        });
      }
      throw err;
    }

    const server = this.serverFactory.createServer(context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await server.connect(transport);
      reply.hijack();
      await transport.handleRequest(req.raw as any, reply.raw, req.body);
    } catch (err) {
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { 'content-type': 'application/json' });
        reply.raw.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal MCP server error' },
            id: null,
          }),
        );
      }
    } finally {
      await transport.close();
      await server.close();
    }
  }

  @Get()
  @Delete()
  @SkipTransform()
  methodNotAllowed(@Res() reply: FastifyReply) {
    return reply.status(405).send({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. Use POST for MCP Streamable HTTP.',
      },
      id: null,
    });
  }
}
