import { Injectable } from '@nestjs/common';
import { WsGateway } from '../ws/ws.gateway';

type ConversationEventPayload = {
  id: string;
};

@Injectable()
export class ConversationsRealtime {
  constructor(private readonly ws: WsGateway) {}

  emitConversationUpdated(payload: ConversationEventPayload & Record<string, unknown>) {
    this.ws.server.to(`conv:${payload.id}`).emit('conversation.updated', payload);
  }

  emitConversationAssigned(
    payload: ConversationEventPayload & {
      assigneeId: string | null;
      assignee?: Record<string, unknown> | null;
    } & Record<string, unknown>,
  ) {
    this.ws.server.to(`conv:${payload.id}`).emit('conversation.assigned', payload);
    this.emitConversationUpdated(payload);
  }

  emitConversationStatusUpdated(
    payload: ConversationEventPayload & {
      status: string;
      previousStatus: string;
    } & Record<string, unknown>,
  ) {
    this.ws.server
      .to(`conv:${payload.id}`)
      .emit('conversation.status.updated', payload);
    this.emitConversationUpdated(payload);
  }

  emitConversationEscalated(
    payload: ConversationEventPayload & {
      isEscalated: boolean;
      escalationTarget?: string | null;
      escalationReason?: string | null;
    } & Record<string, unknown>,
  ) {
    this.ws.server.to(`conv:${payload.id}`).emit('conversation.escalated', payload);
    this.emitConversationUpdated(payload);
  }
}
