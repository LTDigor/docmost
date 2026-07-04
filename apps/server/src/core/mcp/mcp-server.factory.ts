import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { McpToolService } from './mcp-tool.service';
import { McpRequestContext } from './mcp.types';

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
};

@Injectable()
export class McpServerFactory {
  constructor(private readonly toolService: McpToolService) {}

  createServer(context: McpRequestContext): McpServer {
    const server = new McpServer({
      name: 'docmost-knowledge-source',
      version: '0.1.0',
    });

    server.registerTool(
      'search_pages',
      {
        title: 'Search pages',
        description: 'Search visible Docmost pages by query.',
        inputSchema: {
          query: z.string().min(1),
          spaceId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        },
        annotations: readOnlyAnnotations,
      },
      (input) => this.toolService.searchPages(input, context),
    );

    server.registerTool(
      'get_page',
      {
        title: 'Get page',
        description: 'Read a visible Docmost page as clean Markdown.',
        inputSchema: {
          pageId: z.string().min(1),
        },
        annotations: readOnlyAnnotations,
      },
      (input) => this.toolService.getPage(input, context),
    );

    server.registerTool(
      'list_spaces',
      {
        title: 'List spaces',
        description: 'List spaces visible to the MCP token user.',
        annotations: readOnlyAnnotations,
      },
      () => this.toolService.listSpaces(context),
    );

    server.registerTool(
      'list_child_pages',
      {
        title: 'List child pages',
        description:
          'List visible root pages in a space or children of a page.',
        inputSchema: {
          pageId: z.string().min(1).optional(),
          spaceId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        },
        annotations: readOnlyAnnotations,
      },
      (input) => this.toolService.listChildPages(input, context),
    );

    server.registerTool(
      'get_mcp_context',
      {
        title: 'Get MCP context',
        description: 'Show the authenticated workspace, user, and token scope.',
        annotations: readOnlyAnnotations,
      },
      () => this.toolService.getContext(context),
    );

    return server;
  }
}
