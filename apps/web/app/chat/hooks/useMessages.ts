"use client";
import { useEffect, useRef, useState } from "react";
import {
  listMessages,
  markChannelRead,
  sendMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Message } from "../types";

import { normalizeMessage } from "../utils/normalizeMessage";
import { mergeByIdSorted } from "../utils/mergeByIdSorted";
import { useMessageReadTracking } from "../hooks/useMessageReadTracking";
import { useMessageSocketEvents } from "../hooks/useMessageSocketEvents";

type ResolveDisplayName = (id: string) => string | undefined;

type UseMessagesOptions = {
  resolveDisplayName?: ResolveDisplayName;
  onIncomingMessage?: (msg: Message) => void;
  lastReadSnapshot?: string | null;
};

export function useMessages(
  active: string | null,
  userId?: string,
  opts?: UseMessagesOptions,
) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const ready = !!(active && userId);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastReadMessageIdByOthers, setLastReadMessageIdByOthers] = useState<
    string | null
  >(null);

  const lastReadSnapshotRef = useRef<string | null>(null);
  const snapshotForChannelRef = useRef<string | null>(null);

  const resolveNameRef = useRef<ResolveDisplayName | undefined>(undefined);
  useEffect(() => {
    resolveNameRef.current = opts?.resolveDisplayName;
  }, [opts?.resolveDisplayName]);

  const userIdRef = useRef<string | undefined>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const onIncomingRef = useRef<((msg: Message) => void) | undefined>(undefined);
  useEffect(() => {
    onIncomingRef.current = opts?.onIncomingMessage;
  }, [opts?.onIncomingMessage]);

  useEffect(() => {
    setLastReadMessageIdByOthers(null);
  }, [active]);

  // Initial load
  useEffect(() => {
    if (!ready || !active) return;

    (async () => {
      try {
        if (snapshotForChannelRef.current !== active) {
          snapshotForChannelRef.current = active;
          lastReadSnapshotRef.current = opts?.lastReadSnapshot ?? null;
        }

        const raw = await listMessages(active);
        const normalized = raw.reverse().map(normalizeMessage);

        setMsgs(normalized);

        requestAnimationFrame(() => {
          const el = listRef.current;
          if (!el) return;
          el.scrollTop = el.scrollHeight;

          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 64;
          if (nearBottom) markChannelRead(active).catch(() => {});
        });
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    })();
  }, [ready, active, opts?.lastReadSnapshot]);

  // Join/leave channel
  useEffect(() => {
    if (!ready || !active) return;

    const s = getSocket();
    const join = () => s.emit("channel.join", { channelId: active });

    join();
    s.on("connect", join);

    return () => {
      s.off("connect", join);
      try {
        s.emit("channel.leave", { channelId: active });
      } catch {}
    };
  }, [ready, active]);

  // Socket events
  useMessageSocketEvents({
    ready,
    active,
    userIdRef,
    resolveNameRef,
    onIncomingRef,
    setMsgs,
    setLastReadMessageIdByOthers,
  });

  // Read/scroll tracking
  const { nearBottomRef } = useMessageReadTracking({
    ready,
    active,
    listRef,
    msgsLen: msgs.length,
    markRead: markChannelRead,
    thresholdPx: 64,
  });

  // Pagination
  const loadOlder = async () => {
    if (!active || loadingOlder || !hasMore || msgs.length === 0) return;

    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const firstId = msgs[0]?.id;
      if (!firstId) return;

      const older = await listMessages(active, { cursor: firstId, take: 50 });
      const batch = older.reverse().map(normalizeMessage);
      if (batch.length === 0) setHasMore(false);

      setMsgs((prev) => mergeByIdSorted(prev, batch));

      // keep scroll position stable (prevents jump)
      requestAnimationFrame(() => {
        const el2 = listRef.current;
        if (!el2) return;
        const newHeight = el2.scrollHeight;
        el2.scrollTop += newHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const isWhatDidIMiss = (text?: string) => {
    const t = (text ?? "").toLowerCase();
    return (
      t.includes("what did i miss") ||
      t.includes("since last read") ||
      t.includes("wat heb ik gemist") ||
      t.includes("wat mis ik")
    );
  };

  const send = async (
    text?: string,
    replyToMessageId?: string,
    mentionUserIds: string[] = [],
    attachments: Array<{
      url: string;
      fileName: string;
      mimeType: string;
      size: number;
    }> = [],
  ) => {
    if (!active || !userIdRef.current) return;

    const advanceSnapshot = isWhatDidIMiss(text);

    try {
      const sent = await sendMessage(
        active,
        text,
        replyToMessageId,
        mentionUserIds,
        attachments,
        lastReadSnapshotRef.current,
      );

      if (advanceSnapshot) lastReadSnapshotRef.current = sent.createdAt;
    } catch (err) {
      console.error("Failed to send message:", err);

      const failedId = `local-failed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const displayName = resolveNameRef.current?.(userIdRef.current) ?? "You";

      const failedMessage: Message = {
        id: failedId,
        channelId: active,
        content: text ?? "(no content)",
        authorId: userIdRef.current,
        createdAt: new Date().toISOString(),
        updatedAt: undefined,
        deletedAt: null,
        deletedBy: null,
        author: { id: userIdRef.current, displayName, avatarUrl: null },
        reactions: [],
        parent: undefined,
        mentions: [],
        attachments: attachments.map((a, idx) => ({
          id: `local-attach-${idx}`,
          url: a.url,
          fileName: a.fileName,
          mimeType: a.mimeType,
          size: a.size,
        })),
        failed: true,
        pending: false,
      };

      setMsgs((prev) => [...prev, failedMessage]);
    }
  };

  const retrySend = async (failedMessageId: string) => {
    const failed = msgs.find((m) => m.id === failedMessageId && m.failed);
    if (!failed || !active || !userIdRef.current) return;

    setMsgs((prev) => prev.filter((m) => m.id !== failedMessageId));

    await send(
      failed.content ?? undefined,
      failed.parent?.id,
      failed.mentions?.map((mm: any) => mm.userId) ?? [],
      (failed.attachments ?? []).map((a: any) => ({
        url: a.url,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      })),
    );
  };

  const edit = async (messageId: string, text: string) => {
    const prev = msgs.find((m) => m.id === messageId);
    if (!prev || !active) return;

    const optimistic = {
      ...prev,
      content: text,
      updatedAt: new Date().toISOString(),
    };
    setMsgs((curr) => curr.map((m) => (m.id === messageId ? optimistic : m)));

    try {
      await updateMessage(active, messageId, text);
    } catch (e) {
      setMsgs((curr) => curr.map((m) => (m.id === messageId ? prev : m)));
      throw e;
    }
  };

  const remove = async (
    messageId: string,
    actor: { id: string; displayName: string },
  ) => {
    const prev = msgs.find((m) => m.id === messageId);
    if (!prev || !active) return;

    const optimistic = {
      ...prev,
      deletedAt: new Date().toISOString(),
      deletedBy: {
        id: actor.id,
        displayName: actor.displayName,
        avatarUrl: prev.deletedBy?.avatarUrl ?? prev.author.avatarUrl ?? null,
      },
      content: null,
    };

    setMsgs((curr) => curr.map((m) => (m.id === messageId ? optimistic : m)));

    try {
      await deleteMessage(active, messageId);
    } catch (e) {
      setMsgs((curr) => curr.map((m) => (m.id === messageId ? prev : m)));
      throw e;
    }
  };

  return {
    msgs,
    setMsgs,
    listRef,
    send,
    retrySend,
    edit,
    remove,
    loadOlder,
    loadingOlder,
    hasMore,
    ready,
    lastReadMessageIdByOthers,
  };
}
