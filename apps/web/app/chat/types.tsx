export type Channel = {
  id: string;
  name: string;
  isDirect?: boolean;
  members?: Array<{ id: string; displayName: string }>;
};

export type Message = {
  id: string;
  content: string | null;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deletedBy?: { id: string; displayName: string } | null;
  author: { id: string; displayName: string };
};

export type Me = { sub: string; email: string; displayName: string };

export type OnlineUser = {
  id: string;
  displayName: string;
  lastSeen?: string | null;
};

export type ChannelWithUnread = Channel & { unread?: number };
