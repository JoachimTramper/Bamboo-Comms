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

export type Message = {
  id: string;
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
};

import type { MeResponse } from "@/lib/api";
export type Me = MeResponse;

export type OnlineUser = {
  id: string;
  displayName: string;
  lastSeen?: string | null;
  avatarUrl: string | null;
};

export type ChannelWithUnread = Channel & { unread?: number };
