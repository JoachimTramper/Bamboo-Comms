import type { Prisma } from '@prisma/client';

export const CONVERSATION_WITH_PREVIEW_INCLUDE = {
  customer: true,
  assignee: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  },
  escalatedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      content: true,
      createdAt: true,
      channelId: true,
      author: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationWithPreview = Prisma.ConversationGetPayload<{
  include: typeof CONVERSATION_WITH_PREVIEW_INCLUDE;
}>;

export function serializeConversationWithPreview(
  conversation: ConversationWithPreview,
) {
  const { messages, _count, ...rest } = conversation;
  const latestMessage = messages[0] ?? null;

  return {
    ...rest,
    primaryChannelId: latestMessage?.channelId ?? null,
    latestMessagePreview: latestMessage
      ? {
          id: latestMessage.id,
          content: latestMessage.content,
          createdAt: latestMessage.createdAt,
          channelId: latestMessage.channelId,
          author: latestMessage.author,
        }
      : null,
    messageCount: _count.messages,
  };
}
