"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type UIEvent,
} from "react";
import type { Message } from "../types";
import { MessageItem } from "./MessageItem";

type Props = {
  msgs: Message[];
  meId: string;
  channelId: string;
  listRef: RefObject<HTMLDivElement | null>;
  editingId: string | null;
  editText: string;
  setEditText: (v: string) => void;
  onStartEdit: (m: Message) => void;
  onSaveEdit: (m: Message) => void;
  onCancelEdit: () => void;
  onDelete: (m: Message) => void;
  formatDateTime: (iso: string) => string;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  isDirect: boolean;
  lastReadMessageIdByOthers: string | null;
  onReply: (m: Message) => void;
  scrollToMessageId?: string | null;
  onScrolledToMessage?: () => void;
};

export function MessageList({
  msgs = [],
  meId,
  channelId,
  listRef,
  editingId,
  editText,
  setEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
  formatDateTime,
  onScroll,
  isDirect,
  lastReadMessageIdByOthers,
  scrollToMessageId,
  onScrolledToMessage,
}: Props) {
  const safeMsgs = msgs;

  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const lastReadIndex = lastReadMessageIdByOthers
    ? safeMsgs.findIndex((m) => m.id === lastReadMessageIdByOthers)
    : -1;

  // latest message from me that is up to and including lastReadIndex
  const lastMySeenIndex =
    isDirect && lastReadIndex >= 0
      ? (() => {
          for (let i = lastReadIndex; i >= 0; i--) {
            const msg = safeMsgs[i];
            if (!msg) continue;
            if (msg.authorId === meId) return i;
          }
          return -1;
        })()
      : -1;

  // latest message from me in this list
  const lastMyIndex =
    isDirect && safeMsgs.length > 0
      ? (() => {
          for (let i = safeMsgs.length - 1; i >= 0; i--) {
            const msg = safeMsgs[i];
            if (!msg) continue;
            if (msg.authorId === meId) return i;
          }
          return -1;
        })()
      : -1;

  // scroll when a jump target is set
  useEffect(() => {
    if (!scrollToMessageId) return;

    const el = messageRefs.current[scrollToMessageId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // mark this message as highlighted
    setHighlightedId(scrollToMessageId);

    // let ChatPage know it's processed
    onScrolledToMessage?.();
  }, [scrollToMessageId, onScrolledToMessage]);

  // auto-clear highlight after 1.5s
  useEffect(() => {
    if (!highlightedId) return;

    const timeout = window.setTimeout(() => {
      setHighlightedId(null);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [highlightedId]);

  return (
    <div
      ref={listRef}
      onScroll={onScroll}
      className="flex-1 overflow-auto p-4 space-y-3"
    >
      {safeMsgs.map((m, index) => {
        // only the last own message before the other has read
        const showSeen = isDirect && index === lastMySeenIndex;

        // Last own message (for "Sent")
        const isLastOwn =
          isDirect && m.authorId === meId && index === lastMyIndex;

        const isHighlighted = highlightedId === m.id;

        return (
          <div
            key={m.id}
            ref={(el) => {
              messageRefs.current[m.id] = el;
            }}
            className={
              isHighlighted ? "ring-2 ring-blue-400 bg-blue-50 rounded-md" : ""
            }
          >
            <MessageItem
              m={m}
              meId={meId}
              channelId={channelId}
              isMe={m.authorId === meId}
              isDirect={isDirect}
              isEditing={editingId === m.id}
              onStartEdit={() => onStartEdit(m)}
              onSaveEdit={() => onSaveEdit(m)}
              onCancelEdit={onCancelEdit}
              onDelete={() => onDelete(m)}
              onReply={() => onReply(m)}
              editText={editText}
              setEditText={setEditText}
              formatDateTime={formatDateTime}
              showSeen={showSeen}
              isLastOwn={isLastOwn}
            />
          </div>
        );
      })}
    </div>
  );
}
