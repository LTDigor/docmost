import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import {
  ActorType,
  AuditEventType,
  AuditResourceType,
} from '../../common/events/audit-events';

type McpAuditPayload = {
  workspaceId?: string;
  actorId?: string;
  actorType?: ActorType;
  event: AuditEventType;
  resourceType: AuditResourceType;
  resourceId?: string;
  spaceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
};

@Injectable()
export class McpAuditService {
  private readonly logger = new Logger(McpAuditService.name);

  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async log(payload: McpAuditPayload): Promise<void> {
    if (!payload.workspaceId) return;

    try {
      await this.db
        .insertInto('audit')
        .values({
          workspaceId: payload.workspaceId,
          actorId: payload.actorId ?? null,
          actorType: payload.actorType ?? 'mcp_token',
          event: payload.event,
          resourceType: payload.resourceType,
          resourceId: payload.resourceId ?? null,
          spaceId: payload.spaceId ?? null,
          metadata: payload.metadata ?? null,
          ipAddress: payload.ipAddress ?? null,
        })
        .execute();
    } catch (err) {
      this.logger.warn({ err }, 'Failed to write MCP audit event');
    }
  }
}
