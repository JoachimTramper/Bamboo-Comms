"use client";

import { useEffect, useRef } from "react";
import type { ChannelWithUnread, Me } from "../types";

type UserLike = { id: string; displayName: string };

export function useDisplayNameResolver(args: {
  user: Me | null;
  othersOnline: UserLike[];
  recently: UserLike[];
  channels: ChannelWithUnread[];
}) {
  const { user, othersOnline, recently, channels } = args;

  const idToNameRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const map = new Map<string, string>();

    // self
    if (user) map.set(user.sub, user.displayName);

    // presence
    othersOnline.forEach((u) => map.set(u.id, u.displayName));
    recently.forEach((u) => map.set(u.id, u.displayName));

    // channel members (DMs etc.)
    channels.forEach((c) => {
      c.members?.forEach((m) => map.set(m.id, m.displayName));
    });

    idToNameRef.current = map;
  }, [user, othersOnline, recently, channels]);

  function resolveDisplayName(id: string) {
    return idToNameRef.current.get(id);
  }

  return { resolveDisplayName };
}
