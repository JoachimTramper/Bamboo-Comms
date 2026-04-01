// apps/api/src/messages/messages.realtime.ts
import { Injectable } from '@nestjs/common';
import { WsGateway } from '../ws/ws.gateway';

type AuthorPayload = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type ParentPayload = {
  id: string;
  content: string | null;
  author: { id: string; displayName: string };
} | null;

type ReactionPayload = {
  id: string;
  emoji: string;
  user: AuthorPayload;
};

type MentionPayload = {
  userId: string;
  user: AuthorPayload;
};

type AttachmentPayload = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type MessageCreatedPayload = {
  id: string;
  channelId: string;
  conversationId: string | null;
  messageType?: string | null;
  responseTimeMs?: number | null;
  authorId: string;
  content: string | null;
  createdAt: string;
  author: AuthorPayload;
  parent: ParentPayload;
  reactions: ReactionPayload[];
  mentions: MentionPayload[];
  attachments: AttachmentPayload[];
};

type ConversationScopedPayload = {
  conversationId?: string | null;
};

@Injectable()
export class MessagesRealtime {
  constructor(private ws: WsGateway) {}

  private emitConversationScoped<T extends ConversationScopedPayload>(
    event: string,
    payload: T,
  ) {
    if (!payload.conversationId) return;

    this.ws.server.to(`conv:${payload.conversationId}`).emit(event, payload);
  }

  emitMessageCreated(payload: MessageCreatedPayload) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.created', payload);
    this.emitConversationScoped('conversation.message.created', payload);
  }

  emitMessageUpdated(payload: {
    id: string;
    channelId: string;
    conversationId?: string | null;
    content: string | null;
    updatedAt: string;
  }) {
    // keep parity with your current behavior (update visible in both rooms)
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .to(`view:${payload.channelId}`)
      .emit('message.updated', payload);
    this.emitConversationScoped('conversation.message.updated', payload);
  }

  emitMessageDeleted(payload: {
    id: string;
    channelId: string;
    conversationId?: string | null;
    deletedAt: string;
    deletedById: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.deleted', payload);
    this.emitConversationScoped('conversation.message.deleted', payload);
  }

  emitUnreadDelta(payload: {
    userId: string;
    channelId: string;
    delta: number;
    messageId: string;
    at: string;
  }) {
    this.ws.server.to(`user:${payload.userId}`).emit('channel.unread', {
      channelId: payload.channelId,
      delta: payload.delta,
      messageId: payload.messageId,
      at: payload.at,
    });
  }

  emitReactionAdded(payload: {
    messageId: string;
    channelId: string;
    conversationId?: string | null;
    emoji: string;
    userId: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.added', payload);
    this.emitConversationScoped('conversation.message.added', payload);
  }

  emitReactionRemoved(payload: {
    messageId: string;
    channelId: string;
    conversationId?: string | null;
    emoji: string;
    userId: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.removed', payload);
    this.emitConversationScoped('conversation.message.removed', payload);
  }

  emitTyping(payload: {
    channelId: string;
    conversationId?: string | null;
    userId: string;
    displayName: string;
    isTyping: boolean;
  }) {
    this.ws.server.to(`view:${payload.channelId}`).emit('typing', payload);
    this.emitConversationScoped('conversation.typing', payload);
  }
}
