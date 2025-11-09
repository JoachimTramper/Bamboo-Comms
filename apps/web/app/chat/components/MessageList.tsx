"use client";
import type { Message } from "../types";
import { MessageItem } from "./MessageItem";

export function MessageList({
  msgs,
  meId,
  listRef,
  editingId,
  editText,
  setEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  formatDateTime,
}: {
  msgs: Message[];
  meId: string;
  listRef: React.RefObject<HTMLDivElement | null>;
  editingId: string | null;
  editText: string;
  setEditText: (v: string) => void;
  onStartEdit: (m: Message) => void;
  onSaveEdit: (m: Message) => void;
  onCancelEdit: () => void;
  onDelete: (m: Message) => void;
  formatDateTime: (iso: string) => string;
}) {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-3" ref={listRef}>
      {msgs.map((m) => (
        <MessageItem
          key={m.id}
          m={m}
          isMe={m.authorId === meId}
          isEditing={editingId === m.id}
          onStartEdit={() => onStartEdit(m)}
          onSaveEdit={() => onSaveEdit(m)}
          onCancelEdit={onCancelEdit}
          onDelete={() => onDelete(m)}
          editText={editText}
          setEditText={setEditText}
          formatDateTime={formatDateTime}
        />
      ))}
    </div>
  );
}
