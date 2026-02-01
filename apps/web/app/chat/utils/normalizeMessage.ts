import type { Message } from "../types";

export function normalizeMessage(p: any): Message {
  const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;

  return {
    id: p.id,
    content: p.content ?? "",
    authorId: p.authorId ?? p?.author?.id ?? "unknown",
    channelId,
    createdAt:
      typeof p.createdAt === "string"
        ? p.createdAt
        : (p?.created_at ?? new Date().toISOString()),
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
    deletedBy: p.deletedBy ?? null,
    author: p.author
      ? {
          id: p.author.id,
          displayName: p.author.displayName,
          avatarUrl: p.author.avatarUrl ?? null,
        }
      : {
          id: p.authorId ?? "unknown",
          displayName: p?.author?.displayName ?? "Someone",
          avatarUrl: null,
        },
    reactions: (p.reactions ?? []).map((r: any) => ({
      emoji: r.emoji,
      userId: r.userId ?? r.user?.id,
    })),
    parent: p.parent
      ? {
          id: p.parent.id,
          content: p.parent.content,
          author: {
            id: p.parent.author.id,
            displayName: p.parent.author.displayName,
          },
        }
      : null,
    mentions: (p.mentions ?? []).map((mm: any) => ({
      userId: mm.userId ?? mm.user?.id,
      user: mm.user
        ? {
            id: mm.user.id,
            displayName: mm.user.displayName,
            avatarUrl: mm.user.avatarUrl ?? null,
          }
        : undefined,
    })),
    attachments: (p.attachments ?? []).map((a: any) => ({
      id: a.id,
      url: a.url,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
    })),
  };
}
