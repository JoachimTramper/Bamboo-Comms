"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { ChannelWithUnread } from "../types";

export function useUnread({
  active,
  myId,
  setChannels,
}: {
  active: string | null;
  myId?: string;
  setChannels: React.Dispatch<React.SetStateAction<ChannelWithUnread[]>>;
}) {
  // 1) Reset unread to 0 when opening/switching channel
  useEffect(() => {
    if (!active) return;
    setChannels((prev) =>
      prev.map((c) => (c.id === active ? { ...c, unread: 0 } : c))
    );
  }, [active, setChannels]);

  // 2) Increment unread on messages in other channels
  useEffect(() => {
    const s = (() => {
      try {
        return getSocket();
      } catch {
        return null;
      }
    })();
    if (!s) return;

    const onCreated = (payload: any) => {
      const channelId =
        payload?.channelId ?? payload?.channel?.id ?? payload?.channel_id;
      const authorId =
        payload?.author?.id ?? payload?.authorId ?? payload?.userId;
      if (!channelId) return;

      if (channelId === active) {
        // keep active channel at 0
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c))
        );
        return;
      }

      // other channel: unread++ unless my own message
      if (authorId && myId && authorId === myId) return;

      setChannels((prev) => {
        const exists = prev.some((c) => c.id === channelId);
        if (!exists) {
          const label =
            payload?.channel?.name ?? payload?.author?.displayName ?? "Direct";
          const isDirect = !!(payload?.channel?.isDirect ?? payload?.isDirect);
          return [...prev, { id: channelId, name: label, isDirect, unread: 1 }];
        }
        return prev.map((c) =>
          c.id === channelId ? { ...c, unread: (c.unread ?? 0) + 1 } : c
        );
      });
    };

    s.on("message.created", onCreated);
    return () => {
      s.off("message.created", onCreated);
    };
  }, [active, myId, setChannels]);
}
