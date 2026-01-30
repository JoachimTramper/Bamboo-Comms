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
  authorId: string;
  content: string | null;
  createdAt: string;
  author: AuthorPayload;
  parent: ParentPayload;
  reactions: ReactionPayload[];
  mentions: MentionPayload[];
  attachments: AttachmentPayload[];
};

@Injectable()
export class MessagesRealtime {
  constructor(private ws: WsGateway) {}

  emitMessageCreated(payload: MessageCreatedPayload) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.created', payload);
  }

  emitMessageUpdated(payload: {
    id: string;
    channelId: string;
    content: string | null;
    updatedAt: string;
  }) {
    // keep parity with your current behavior (update visible in both rooms)
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .to(`view:${payload.channelId}`)
      .emit('message.updated', payload);
  }

  emitMessageDeleted(payload: {
    id: string;
    channelId: string;
    deletedAt: string;
    deletedById: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.deleted', payload);
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
    emoji: string;
    userId: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.added', payload);
  }

  emitReactionRemoved(payload: {
    messageId: string;
    channelId: string;
    emoji: string;
    userId: string;
  }) {
    this.ws.server
      .to(`chan:${payload.channelId}`)
      .emit('message.removed', payload);
  }

  emitTyping(payload: {
    channelId: string;
    userId: string;
    displayName: string;
    isTyping: boolean;
  }) {
    this.ws.server.to(`view:${payload.channelId}`).emit('typing', payload);
  }
}
