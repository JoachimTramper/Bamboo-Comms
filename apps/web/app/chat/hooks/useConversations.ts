"use client";

import { useEffect, useState } from "react";
import { getConversationById, listConversations } from "@/lib/api";
import type {
  ConversationPriority,
  ConversationStatus,
  SupportConversation,
} from "../types";
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

function hasNewConversationActivity(
  previous: SupportConversation,
  next: SupportConversation,
) {
  const previousAt = previous.lastMessageAt
    ? new Date(previous.lastMessageAt).getTime()
    : 0;
  const nextAt = next.lastMessageAt ? new Date(next.lastMessageAt).getTime() : 0;

  return nextAt > previousAt;
}

export function useConversations(
  enabled: boolean,
  preferredConversationId?: string | null,
  supportViewOpen = false,
) {
  const [filters, setFilters] = useState<{
    status?: ConversationStatus;
    priority?: ConversationPriority;
    assigneeId?: string;
  }>({});
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeConversation, setActiveConversation] =
    useState<SupportConversation | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      setListError(null);
      setActiveError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingList(true);
        setListError(null);
        const items = await listConversations(filters);
        if (cancelled) return;

        setConversations((prev) => {
          const unreadById = new Map(
            prev.map((conversation) => [conversation.id, conversation.unread ?? 0]),
          );

          return items.map((conversation) => ({
            ...conversation,
            unread: unreadById.get(conversation.id) ?? conversation.unread ?? 0,
          }));
        });
        setActiveConversationId((prev) => {
          if (prev && items.some((item) => item.id === prev)) return prev;
          if (
            preferredConversationId &&
            items.some((item) => item.id === preferredConversationId)
          ) {
            return preferredConversationId;
          }
          return items[0]?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          setListError("We couldn't load the support inbox right now.");
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
  }, [enabled, filters, preferredConversationId]);

  useEffect(() => {
    if (!enabled || !activeConversationId) {
      setActiveConversation(null);
      if (!activeConversationId) {
        setActiveError(null);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingActive(true);
        setActiveError(null);
        const conversation = await getConversationById(activeConversationId);
        if (cancelled) return;

        setActiveConversation({ ...conversation, unread: 0 });
        setConversations((prev) =>
          prev.map((item) =>
            item.id === conversation.id
              ? { ...item, ...conversation, unread: 0 }
              : item,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          setActiveError("We couldn't load this conversation right now.");
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
        prev.some((item) => item.id === payload.id)
          ? prev.map((item) =>
              item.id === payload.id
                ? {
                    ...item,
                    ...payload,
                    unread:
                      supportViewOpen && activeConversationId === payload.id
                        ? 0
                        : hasNewConversationActivity(item, payload)
                          ? (item.unread ?? 0) + 1
                          : item.unread ?? 0,
                  }
                : item,
            )
          : [
              {
                ...payload,
                unread: 0,
              },
              ...prev,
            ],
      );
      setActiveConversation((prev) => mergeConversation(prev, payload));
    };

    const onConversationCreated = (payload: SupportConversation) => {
      setConversations((prev) =>
        prev.some((item) => item.id === payload.id)
          ? prev
          : [{ ...payload, unread: 0 }, ...prev],
      );
    };

    socket.on("conversation.created", onConversationCreated);
    socket.on("conversation.updated", onConversationUpdate);
    socket.on("conversation.assigned", onConversationUpdate);
    socket.on("conversation.status.updated", onConversationUpdate);
    socket.on("conversation.escalated", onConversationUpdate);

    return () => {
      socket?.off("conversation.created", onConversationCreated);
      socket?.off("conversation.updated", onConversationUpdate);
      socket?.off("conversation.assigned", onConversationUpdate);
      socket?.off("conversation.status.updated", onConversationUpdate);
      socket?.off("conversation.escalated", onConversationUpdate);
    };
  }, [activeConversationId, enabled, supportViewOpen]);

  useEffect(() => {
    if (!supportViewOpen || !activeConversationId) return;

    setConversations((prev) =>
      prev.map((item) =>
        item.id === activeConversationId ? { ...item, unread: 0 } : item,
      ),
    );
    setActiveConversation((prev) =>
      prev && prev.id === activeConversationId ? { ...prev, unread: 0 } : prev,
    );
  }, [activeConversationId, supportViewOpen]);

  return {
    filters,
    setFilters,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    setActiveConversation,
    loadingList,
    loadingActive,
    listError,
    activeError,
  };
}
