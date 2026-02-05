// hooks/useChannels.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listChannelsWithUnread,
  listDirectChannels,
  getOrCreateDirectChannel,
  createChannel,
} from "@/lib/api";
import type { ChannelWithUnread, Me } from "../types";
import { mergeChannelsById } from "../utils/utils";

export function useChannels(user: Me | null) {
  const [channels, setChannels] = useState<ChannelWithUnread[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const [newChannel, setNewChannel] = useState("");
  const [creating, setCreating] = useState(false);

  // initial channels + active (restore saved first, else general, else first)
  useEffect(() => {
    (async () => {
      try {
        const items = await listChannelsWithUnread();
        setChannels(mergeChannelsById([], items ?? []));

        setActive((prev) => {
          if (prev) return prev;

          const saved = user?.sub
            ? localStorage.getItem(`lastChannel:${user.sub}`)
            : null;

          const general = items?.find(
            (c) => !c.isDirect && c.name === "general",
          );
          const fallback = general?.id ?? items?.[0]?.id ?? null;

          if (saved && items?.some((c) => c.id === saved)) return saved;
          return fallback;
        });
      } catch (e) {
        console.error("Failed to load channels with unread:", e);
      }
    })();
  }, [user?.sub]);

  // DMs enrich (preserve members)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const dms = await listDirectChannels();
        const normalized = dms.map((dm) => {
          const other = dm.members?.find((m: any) => m.id !== user.sub);
          return {
            id: dm.id,
            name: other?.displayName || dm.name || "Direct",
            isDirect: true,
            members: dm.members ?? [],
          } as ChannelWithUnread;
        });

        setChannels((prev) => mergeChannelsById(prev, normalized));
      } catch (e) {
        console.error("Failed to load DMs:", e);
      }
    })();
  }, [user]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === active),
    [channels, active],
  );

  const regularChannels = useMemo(
    () => channels.filter((c) => !c.isDirect),
    [channels],
  );

  const dmChannels = useMemo(
    () => channels.filter((c) => c.isDirect),
    [channels],
  );

  async function onCreateChannel() {
    if (!newChannel.trim()) return;
    try {
      setCreating(true);
      const c = await createChannel(newChannel.trim());
      setChannels((prev) => [...prev, c]);
      setActive(c.id);

      if (user?.sub) localStorage.setItem(`lastChannel:${user.sub}`, c.id);

      setNewChannel("");
    } finally {
      setCreating(false);
    }
  }

  async function openDM(otherUserId: string) {
    if (!user) return;
    try {
      const dm = await getOrCreateDirectChannel(otherUserId);
      const other = dm.members?.find((m: any) => m.id !== user.sub);
      const label = other?.displayName || dm.name || "Direct";

      setChannels((prev) =>
        prev.some((c) => c.id === dm.id)
          ? prev
          : [
              ...prev,
              {
                id: dm.id,
                name: label,
                isDirect: true,
                members: dm.members ?? [],
              } as ChannelWithUnread,
            ],
      );

      setActive(dm.id);
      localStorage.setItem(`lastChannel:${user.sub}`, dm.id);
    } catch (e) {
      console.error("Failed to open DM:", e);
    }
  }

  return {
    channels,
    setChannels,
    active,
    setActive,
    activeChannel,
    regularChannels,
    dmChannels,
    newChannel,
    setNewChannel,
    creating,
    onCreateChannel,
    openDM,
  };
}
