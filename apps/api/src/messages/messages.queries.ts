// apps/api/src/messages/messages.queries.ts

export const MESSAGE_AUTHOR_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;

export const MESSAGE_DELETED_BY_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;

export const MESSAGE_PARENT_SELECT = {
  id: true,
  content: true,
  author: { select: { id: true, displayName: true } },
} as const;

export const MESSAGE_REACTIONS_INCLUDE = {
  include: {
    user: { select: MESSAGE_AUTHOR_SELECT },
  },
} as const;

export const MESSAGE_MENTIONS_INCLUDE = {
  include: {
    user: { select: MESSAGE_AUTHOR_SELECT },
  },
} as const;

export const MESSAGE_MENTIONS_SELECT = {
  userId: true,
  user: { select: MESSAGE_AUTHOR_SELECT },
} as const;

// Use this for list/create (full payload)
export const MESSAGE_INCLUDE_FULL = {
  author: { select: MESSAGE_AUTHOR_SELECT },
  deletedBy: { select: MESSAGE_DELETED_BY_SELECT },
  parent: { select: MESSAGE_PARENT_SELECT },
  reactions: MESSAGE_REACTIONS_INCLUDE,
  mentions: MESSAGE_MENTIONS_INCLUDE,
  attachments: true,
} as const;

// Use this for search (no attachments in your current code snippet)
export const MESSAGE_INCLUDE_SEARCH = {
  author: { select: MESSAGE_AUTHOR_SELECT },
  deletedBy: { select: MESSAGE_DELETED_BY_SELECT },
  parent: { select: MESSAGE_PARENT_SELECT },
  reactions: MESSAGE_REACTIONS_INCLUDE,
  mentions: { select: MESSAGE_MENTIONS_SELECT },
} as const;
