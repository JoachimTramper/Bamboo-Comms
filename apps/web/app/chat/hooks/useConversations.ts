"use client";

import { useEffect, useState } from "react";
import { getConversationById, listConversations } from "@/lib/api";
import type { SupportConversation } from "../types";

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

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    loadingList,
    loadingActive,
  };
}
