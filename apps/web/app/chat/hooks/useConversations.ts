"use client";

import { useEffect, useState } from "react";
import { getConversationById, listConversations } from "@/lib/api";
import type { SupportConversation } from "../types";
import { getSocket } from "@/lib/socket";

function mergeConversation(
  current: SupportConversation | null,
  next: Partial<SupportConversation> & { id: string },
) {
  if (!current || current.id !== next.id) {
    return current;
  }

  return { ...current, ...next };
}

export function useConversations(enabled: boolean) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeConversation, setActiveConversation] =
    useState<SupportConversation | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingList(true);
        const items = await listConversations();
        if (cancelled) return;

        setConversations(items);
        setActiveConversationId((prev) => {
          if (prev && items.some((item) => item.id === prev)) return prev;
          return items[0]?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load conversations:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !activeConversationId) {
      setActiveConversation(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingActive(true);
        const conversation = await getConversationById(activeConversationId);
        if (cancelled) return;

        setActiveConversation(conversation);
        setConversations((prev) =>
          prev.map((item) =>
            item.id === conversation.id ? { ...item, ...conversation } : item,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load conversation:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, activeConversationId]);

  useEffect(() => {
    if (!enabled) return;

    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      socket = null;
    }
    if (!socket) return;

    const onConversationUpdate = (payload: SupportConversation) => {
      setConversations((prev) =>
        prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item)),
      );
      setActiveConversation((prev) => mergeConversation(prev, payload));
    };

    socket.on("conversation.updated", onConversationUpdate);
    socket.on("conversation.assigned", onConversationUpdate);
    socket.on("conversation.status.updated", onConversationUpdate);

    return () => {
      socket?.off("conversation.updated", onConversationUpdate);
      socket?.off("conversation.assigned", onConversationUpdate);
      socket?.off("conversation.status.updated", onConversationUpdate);
    };
  }, [enabled]);

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    setActiveConversation,
    loadingList,
    loadingActive,
  };
}
