"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { ChannelWithUnread } from "../types";

type ChannelUnreadPayload = {
  channelId?: string;
  delta?: number;
};

export function useUnread({
  active,
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

  // 2) Realtime unread updates
  useEffect(() => {
    const s = (() => {
      try {
        return getSocket();
      } catch {
        return null;
      }
    })();
    if (!s) return;

    const onUnread = (payload: ChannelUnreadPayload) => {
      const channelId = payload?.channelId;
      const delta = payload?.delta ?? 1;
      if (!channelId) return;

      // active channel stays at 0
      if (channelId === active) {
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c))
        );
        return;
      }

      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, unread: (c.unread ?? 0) + delta } : c
        )
      );
    };

    s.on("channel.unread", onUnread);

    return () => {
      s.off("channel.unread", onUnread);
    };
  }, [active, setChannels]);
}
