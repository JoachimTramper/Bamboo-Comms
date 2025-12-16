"use client";

import { useMemo } from "react";
import type { ChannelWithUnread, OnlineUser } from "../types"; // pas evt. paden aan
import { formatLastOnline } from "../utils/utils";

export type DmPeer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isIdle: boolean;
  statusText: string;
};

type UseDmPeerOpts = {
  activeChannel: ChannelWithUnread | undefined;
  myId?: string; // <-- was: string
  othersOnline: (OnlineUser & { status?: "online" | "idle" })[];
  recently: OnlineUser[];
};

export function useDmPeer({
  activeChannel,
  myId,
  othersOnline,
  recently,
}: UseDmPeerOpts) {
  return useMemo<DmPeer | null>(() => {
    if (!myId) return null;
    if (!activeChannel?.isDirect) return null;

    const member = activeChannel.members?.find((m) => m.id !== myId);
    if (!member) return null;

    const onlineEntry = othersOnline.find((u) => u.id === member.id);
    const recent = recently.find((u) => u.id === member.id);

    const status: "online" | "idle" | "offline" = onlineEntry
      ? onlineEntry.status === "idle"
        ? "idle"
        : "online"
      : "offline";

    const statusText =
      status === "online"
        ? "Online"
        : status === "idle"
          ? "Idle"
          : recent
            ? formatLastOnline(recent.lastSeen)
            : "Offline";

    return {
      id: member.id,
      displayName: member.displayName,
      avatarUrl:
        member.avatarUrl ??
        (onlineEntry as any)?.avatarUrl ??
        (recent as any)?.avatarUrl ??
        null,
      isOnline: status === "online" || status === "idle",
      isIdle: status === "idle",
      statusText,
    };
  }, [activeChannel, myId, othersOnline, recently]);
}
