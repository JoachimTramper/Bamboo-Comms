"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { OnlineUser } from "../types";

export function usePresence(myId?: string) {
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [recently, setRecently] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const s = (() => {
      try {
        return getSocket();
      } catch {
        return null;
      }
    })();
    if (!s) return;

    const onSnapshot = (p: {
      online: OnlineUser[];
      recently?: OnlineUser[];
    }) => {
      setOnline(p.online ?? []);
      setRecently(p.recently ?? []);
    };
    const onUpdate = (p: { user: OnlineUser; isOnline: boolean }) => {
      setOnline((prev) => {
        const exists = prev.some((u) => u.id === p.user.id);
        if (p.isOnline)
          return exists
            ? prev.map((u) => (u.id === p.user.id ? p.user : u))
            : [...prev, p.user];
        return prev.filter((u) => u.id !== p.user.id);
      });
      setRecently((prev) => {
        if (p.isOnline) return prev.filter((u) => u.id !== p.user.id);
        const others = prev.filter((u) => u.id !== p.user.id);
        const next = [p.user, ...others];
        return next
          .sort(
            (a, b) =>
              new Date(b.lastSeen || 0).getTime() -
              new Date(a.lastSeen || 0).getTime()
          )
          .slice(0, 20);
      });
    };

    s.on("presence.snapshot", onSnapshot);
    s.on("presence.update", onUpdate);
    return () => {
      s.off("presence.snapshot", onSnapshot);
      s.off("presence.update", onUpdate);
    };
  }, []);

  const othersOnline = online.filter((u) => u.id !== myId);
  return { online, recently, othersOnline };
}
