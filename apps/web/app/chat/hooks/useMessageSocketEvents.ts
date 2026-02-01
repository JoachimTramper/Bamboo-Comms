import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { Message } from "../types";
import { normalizeMessage } from "../utils/normalizeMessage";

type ResolveDisplayName = (id: string) => string | undefined;

type RefLike<T> = { current: T };

type SetState<T> = (value: T | ((prev: T) => T)) => void;

type Args = {
  ready: boolean;
  active: string | null;

  userIdRef: RefLike<string | undefined>;
  resolveNameRef: RefLike<ResolveDisplayName | undefined>;
  onIncomingRef: RefLike<((msg: Message) => void) | undefined>;

  setMsgs: SetState<Message[]>;
  setLastReadMessageIdByOthers: SetState<string | null>;
};

export function useMessageSocketEvents({
  ready,
  active,
  userIdRef,
  resolveNameRef,
  onIncomingRef,
  setMsgs,
  setLastReadMessageIdByOthers,
}: Args) {
  useEffect(() => {
    if (!ready) return;

    const s = getSocket();

    const onCreated = (p: any) => {
      const msg = normalizeMessage(p);
      const channelId = msg.channelId;

      // Only add to UI if this is the active channel
      if (channelId && channelId === active) {
        setMsgs((prev) => [...prev, msg]);
      }

      // ALWAYS notify incoming callback (notifications, unread counts, etc.)
      onIncomingRef.current?.(msg);
    };

    const onUpdated = (p: any) => {
      const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;
      if (!active || channelId !== active) return;

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === p.id
            ? {
                ...m,
                content: p.content ?? null,
                updatedAt: p.updatedAt,
              }
            : m,
        ),
      );
    };

    const onDeleted = (p: any) => {
      const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;
      if (!active || channelId !== active) return;

      const deletedById = p.deletedById ?? p?.deletedBy?.id;

      const displayName =
        p.deletedBy?.displayName ??
        (deletedById ? resolveNameRef.current?.(deletedById) : undefined) ??
        (deletedById && userIdRef.current && deletedById === userIdRef.current
          ? "You"
          : undefined) ??
        "Unknown";

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === p.id
            ? {
                ...m,
                deletedAt: p.deletedAt ?? new Date().toISOString(),
                deletedBy: p.deletedBy
                  ? {
                      id: p.deletedBy.id,
                      displayName: p.deletedBy.displayName,
                      avatarUrl: p.deletedBy.avatarUrl ?? null,
                    }
                  : deletedById
                    ? {
                        id: deletedById,
                        displayName,
                        avatarUrl: null,
                      }
                    : null,
                content: null,
              }
            : m,
        ),
      );
    };

    const onReactionAdded = (p: any) => {
      const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;
      if (!active || channelId !== active) return;

      setMsgs((prev) =>
        prev.map((m) => {
          if (m.id !== p.messageId) return m;

          const reactions = m.reactions ?? [];
          const already = reactions.some(
            (r) => r.emoji === p.emoji && r.userId === p.userId,
          );
          if (already) return m;

          return {
            ...m,
            reactions: [...reactions, { emoji: p.emoji, userId: p.userId }],
          };
        }),
      );
    };

    const onReactionRemoved = (p: any) => {
      const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;
      if (!active || channelId !== active) return;

      setMsgs((prev) =>
        prev.map((m) => {
          if (m.id !== p.messageId) return m;

          const reactions = m.reactions ?? [];
          const next = reactions.filter(
            (r) => !(r.emoji === p.emoji && r.userId === p.userId),
          );

          return { ...m, reactions: next };
        }),
      );
    };

    const onRead = (p: any) => {
      const channelId = p?.channelId ?? p?.channel?.id ?? p?.channel_id;
      if (!active || channelId !== active) return;

      if (p.userId && p.userId === userIdRef.current) return;

      if (p.messageId) {
        setLastReadMessageIdByOthers(p.messageId);
      }
    };

    s.on("message.read", onRead);
    s.on("message.created", onCreated);
    s.on("message.updated", onUpdated);
    s.on("message.deleted", onDeleted);
    s.on("message.added", onReactionAdded);
    s.on("message.removed", onReactionRemoved);

    return () => {
      s.off("message.read", onRead);
      s.off("message.created", onCreated);
      s.off("message.updated", onUpdated);
      s.off("message.deleted", onDeleted);
      s.off("message.added", onReactionAdded);
      s.off("message.removed", onReactionRemoved);
    };
  }, [
    ready,
    active,
    userIdRef,
    resolveNameRef,
    onIncomingRef,
    setMsgs,
    setLastReadMessageIdByOthers,
  ]);
}
