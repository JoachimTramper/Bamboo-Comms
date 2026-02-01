import { useEffect, useRef } from "react";

type Args = {
  ready: boolean;
  active: string | null;
  listRef: React.RefObject<HTMLDivElement | null>;
  msgsLen: number; // alleen length nodig
  markRead: (channelId: string) => Promise<any>;
  thresholdPx?: number; // default 64
};

export function useMessageReadTracking({
  ready,
  active,
  listRef,
  msgsLen,
  markRead,
  thresholdPx = 64,
}: Args) {
  const nearBottomRef = useRef(false);

  // Track near-bottom on scroll + mark read on transition (false -> true)
  useEffect(() => {
    if (!ready || !active) return;
    const el = listRef.current;
    if (!el) return;

    const update = () => {
      const was = nearBottomRef.current;
      const is = el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;

      nearBottomRef.current = is;

      if (!was && is) {
        markRead(active).catch(() => {});
      }
    };

    el.addEventListener("scroll", update);
    update();

    return () => {
      el.removeEventListener("scroll", update);
    };
  }, [ready, active, listRef, markRead, thresholdPx]);

  // Auto-scroll on new messages if near-bottom + mark read
  useEffect(() => {
    if (!ready || !active) return;
    const el = listRef.current;
    if (!el) return;

    if (!nearBottomRef.current) return;

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    markRead(active).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgsLen, ready, active]);

  // Mark read on focus / tab visible (only if near-bottom)
  useEffect(() => {
    if (!ready || !active) return;

    const markIfAtBottom = () => {
      if (!nearBottomRef.current) return;
      markRead(active).catch(() => {});
    };

    const onVis = () => {
      if (document.visibilityState === "visible") markIfAtBottom();
    };

    window.addEventListener("focus", markIfAtBottom);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", markIfAtBottom);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, active, markRead]);

  return { nearBottomRef };
}
