"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

export function useChannelRooms(
  socket: Socket | null,
  activeChannelId?: string
) {
  const prevId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!socket || !activeChannelId) return;

    // leave previous room (if switching)
    if (prevId.current && prevId.current !== activeChannelId) {
      socket.emit("channel.leave", { channelId: prevId.current });
    }

    // join current room
    socket.emit("channel.join", { channelId: activeChannelId });
    prevId.current = activeChannelId;

    // leave on unmount
    return () => {
      socket.emit("channel.leave", { channelId: activeChannelId });
    };
  }, [socket, activeChannelId]);
}
