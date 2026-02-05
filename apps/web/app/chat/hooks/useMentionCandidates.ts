"use client";

import { useMemo } from "react";
import type { ChannelWithUnread, Me, OnlineUser } from "../types";

type MentionCandidate = { id: string; displayName: string };

type Opts = {
  activeChannel: ChannelWithUnread | undefined;
  user?: Me | null;
  othersOnline: OnlineUser[];
  recently: OnlineUser[];
};

export function useMentionCandidates({
  activeChannel,
  user,
  othersOnline,
  recently,
}: Opts) {
  return useMemo<MentionCandidate[]>(() => {
    const myId = user?.sub ?? null;
    const isDirect = !!activeChannel?.isDirect;

    // 1) Start with members if we have them, otherwise fallback to presence/self
    const base: MentionCandidate[] = (() => {
      if (activeChannel?.members?.length) {
        return activeChannel.members.map((m) => ({
          id: m.id,
          displayName: m.displayName,
        }));
      }

      if (!user) return [];

      return [
        { id: user.sub, displayName: user.displayName },
        ...othersOnline.map((u) => ({ id: u.id, displayName: u.displayName })),
        ...recently.map((u) => ({ id: u.id, displayName: u.displayName })),
      ];
    })();

    // 2) Add bot in channels (not DMs) if available from /auth/me
    const bot = user?.bot ?? null;

    const all: MentionCandidate[] = [
      ...base,
      ...(!isDirect && bot
        ? [{ id: bot.id, displayName: bot.displayName }]
        : []),
    ];

    // 3) Filter out self + dedupe
    const seen = new Set<string>();
    return all.filter((c) => {
      if (!c?.id) return false;
      if (myId && c.id === myId) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [activeChannel, user, othersOnline, recently]);
}
