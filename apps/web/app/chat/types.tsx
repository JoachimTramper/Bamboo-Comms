// app/chat/types.ts
export type Channel = {
  id: string;
  name: string;
  isDirect?: boolean;
  members?: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
};

export type MessageReaction = {
  emoji: string;
  userId: string;
};

export type MessageMention = {
  userId?: string; // for list-endpoint that only returns userId
  user?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type MessageParent = {
  id: string;
  content: string | null;
  author: {
    id: string;
    displayName: string;
  };
};

export type MessageAttachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type Message = {
  id: string;
  channelId: string;
  conversationId?: string | null;
  content: string | null;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deletedBy?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reactions?: MessageReaction[];
  parent?: MessageParent | null;
  mentions?: MessageMention[];
  attachments?: MessageAttachment[];
  pending?: boolean;
  failed?: boolean;
};

import type { MeResponse } from "@/lib/api";
export type Me = MeResponse;

export type OnlineUser = {
  id: string;
  displayName: string;
  lastSeen?: string | null;
  avatarUrl: string | null;
  status?: "online" | "idle";
};

export type ChannelWithUnread = Channel & {
  unread?: number;
  lastRead?: string | null;
};

export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type InternalNote = {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type ConversationLifecycleAction =
  | "OPEN"
  | "PENDING"
  | "RESOLVE"
  | "CLOSE"
  | "REOPEN";

export type SupportConversation = {
  id: string;
  subject: string | null;
  status: ConversationStatus;
  priority: ConversationPriority;
  tags: string[];
  isEscalated: boolean;
  escalationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  lastSupportReplyAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  escalatedAt: string | null;
  primaryChannelId: string | null;
  messageCount: number;
  customerId?: string | null;
  assigneeId?: string | null;
  customer?: {
    id: string;
    email?: string | null;
    name?: string | null;
    company?: string | null;
    planTier?: string | null;
  } | null;
  assignee?: {
    id: string;
    email: string;
    displayName: string;
    role: "USER" | "ADMIN";
  } | null;
  escalatedBy?: {
    id: string;
    email: string;
    displayName: string;
    role: "USER" | "ADMIN";
  } | null;
  latestMessagePreview?: {
    id: string;
    content: string | null;
    createdAt: string;
    channelId: string;
    author: {
      id: string;
      displayName: string;
    };
  } | null;
};
