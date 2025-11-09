"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

export function useTyping(active: string | null, myId?: string) {
  const [typing, setTyping] = useState<
    Record<string, { name: string; ts: number }>
  >({});
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !myId) return;
    const s = (() => {
      try {
        return getSocket();
      } catch {
        return null;
      }
    })();
    if (!s) return;

    const onTyping = (p: {
      channelId: string;
      userId: string;
      displayName: string;
      isTyping: boolean;
    }) => {
      if (p.channelId !== active) return;
      if (p.userId === myId) return;
      setTyping((prev) => {
        const next = { ...prev };
        if (p.isTyping)
          next[p.userId] = { name: p.displayName, ts: Date.now() };
        else delete next[p.userId];
        return next;
      });
    };

    s.on("typing", onTyping);
    const interval = setInterval(() => {
      const now = Date.now();
      setTyping((prev) => {
        const next: Record<string, { name: string; ts: number }> = {};
        for (const [uid, info] of Object.entries(prev))
          if (now - info.ts < 3000) next[uid] = info;
        return next;
      });
    }, 1000);

    return () => {
      s.off("typing", onTyping);
      clearInterval(interval);
    };
  }, [active, myId]);

  const emitTyping = (channelId: string) => {
    const s = (() => {
      try {
        return getSocket();
      } catch {
        return null;
      }
    })();
    if (!s) return;
    s.emit("typing", { channelId, isTyping: true });
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      try {
        s.emit("typing", { channelId, isTyping: false });
      } catch {}
    }, 1500);
  };

  const names = Object.values(typing).map((t) => t.name);
  let label = "";
  if (names.length === 1) label = `${names[0]} is typing…`;
  else if (names.length === 2)
    label = `${names[0]} and ${names[1]} are typing…`;
  else if (names.length >= 3)
    label = `${names[0]}, ${names[1]} and others are typing…`;

  return { typing, label, emitTyping };
}
