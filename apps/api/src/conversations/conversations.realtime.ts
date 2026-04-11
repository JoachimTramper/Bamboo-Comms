import { Injectable } from '@nestjs/common';
import { WsGateway } from '../ws/ws.gateway';

type ConversationEventPayload = {
  id: string;
};

@Injectable()
export class ConversationsRealtime {
  constructor(private readonly ws: WsGateway) {}

  private emitToUsers(
    event: string,
    payload: ConversationEventPayload & Record<string, unknown>,
    userIds: string[] = [],
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

    for (const userId of uniqueUserIds) {
      this.ws.server.to(`user:${userId}`).emit(event, payload);
    }
  }

  emitConversationCreated(
    payload: ConversationEventPayload & Record<string, unknown>,
  ) {
    this.ws.server.emit('conversation.created', payload);
    this.emitConversationUpdated(payload);
  }

  emitConversationUpdated(
    payload: ConversationEventPayload & Record<string, unknown>,
    userIds: string[] = [],
  ) {
    this.ws.server.to(`conv:${payload.id}`).emit('conversation.updated', payload);
    this.emitToUsers('conversation.updated', payload, userIds);
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
