"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { Message } from "../types";
import { Avatar } from "./Avatar";
import { MessageBody } from "./MessageBody";

export function MessageItem({
  m,
  meId,
  channelId,
  isMe,
  isDirect,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
  editText,
  setEditText,
  formatDateTime,
  showSeen,
  isLastOwn,
  onRetry,
}: {
  m: Message;
  meId: string;
  channelId: string;
  isMe: boolean;
  isDirect: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  editText: string;
  setEditText: (v: string) => void;
  formatDateTime: (iso: string) => string;
  showSeen?: boolean;
  isLastOwn?: boolean;
  onRetry?: () => void;
}) {
  const isDeleted = !!m.deletedAt;
  const isEdited =
    !!m.updatedAt &&
    new Date(m.updatedAt).getTime() > new Date(m.createdAt).getTime();

  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchPointer = (e: React.PointerEvent) => e.pointerType === "touch";
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isMine = m.authorId === meId;
  const isDmMine = isDirect && isMine;
  const hasReactions = (m.reactions?.length ?? 0) > 0;

  const isMentioned =
    !isMine &&
    !!m.mentions?.some((mm: any) => mm.userId === meId || mm.user?.id === meId);

  const openMenu = () => {
    if (isDeleted) return;
    setMenuOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTouchPointer(e)) return;
    if (e.button !== 0) return;

    longPressTimer.current = setTimeout(() => {
      openMenu();
    }, 400);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isTouchPointer(e)) return;
    clearLongPress();
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (!isTouchPointer(e)) return;
    clearLongPress();
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (menuRef.current?.contains(target)) return;

      closeMenu();
    };

    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);

    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
  }, [menuOpen]);

  return (
    <div
      className="group py-px rounded-md hover:bg-gray-50"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {isDirect ? (
        <div
          className={`flex items-start gap-3 ${
            isDmMine ? "flex-row-reverse" : ""
          }`}
        >
          {/* avatar (always in DM) */}
          <div className="shrink-0">
            <Avatar
              name={m.author.displayName}
              avatarUrl={m.author.avatarUrl ?? null}
              size={32}
            />
          </div>

          {/* message stack */}
          <div
            className={[
              "min-w-0 flex flex-col gap-1",
              "max-w-[90%] sm:max-w-[80%]",
              isDmMine ? "ml-auto items-end" : "items-start",
            ].join(" ")}
          >
            {/* header */}
            <div
              className={[
                "text-xs text-gray-500 whitespace-nowrap",
                isDmMine ? "self-end text-right" : "self-start text-left",
              ].join(" ")}
            >
              {isDmMine ? (
                <>
                  <time dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="font-medium text-gray-700">
                    {m.author.displayName}
                  </span>
                  {isEdited && !isDeleted && (
                    <span className="ml-2 italic text-gray-400">(edited)</span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-700">
                    {m.author.displayName}
                  </span>
                  <span className="mx-2 text-gray-400">•</span>
                  <time dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                  {isEdited && !isDeleted && (
                    <span className="ml-2 italic text-gray-400">(edited)</span>
                  )}
                  {isMentioned && (
                    <>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                        Mentions you
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            <MessageBody
              m={m}
              isMine={isMine}
              isDirect={isDirect}
              isDmMine={isDmMine}
              isDeleted={isDeleted}
              isEdited={isEdited}
              isEditing={isEditing}
              editText={editText}
              setEditText={setEditText}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onRetry={onRetry}
              channelId={channelId}
              meId={meId}
              menuOpen={menuOpen}
              hasReactions={hasReactions}
              isLastOwn={isLastOwn}
              showSeen={showSeen}
              closeMenu={closeMenu}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onReply={onReply}
              menuRef={menuRef}
            />
          </div>
        </div>
      ) : (
        // non-DM layout
        <div className="grid grid-cols-[32px_1fr_32px] gap-3 items-start">
          <div className="flex justify-start">
            <Avatar
              name={m.author.displayName}
              avatarUrl={m.author.avatarUrl ?? null}
              size={32}
            />
          </div>

          <div className="min-w-0">
            <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-700">
                {m.author.displayName}
              </span>
              <span>•</span>
              <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
              {isEdited && !isDeleted && (
                <span className="italic text-gray-400">(edited)</span>
              )}
              {isMentioned && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                    Mentions you
                  </span>
                </>
              )}
            </div>

            <MessageBody
              m={m}
              isMine={isMine}
              isDirect={isDirect}
              isDmMine={false}
              isDeleted={isDeleted}
              isEdited={isEdited}
              isEditing={isEditing}
              editText={editText}
              setEditText={setEditText}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onRetry={onRetry}
              channelId={channelId}
              meId={meId}
              menuOpen={menuOpen}
              hasReactions={hasReactions}
              isLastOwn={false}
              showSeen={false}
              closeMenu={closeMenu}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onReply={onReply}
              menuRef={menuRef}
            />
          </div>

          <div />
        </div>
      )}
    </div>
  );
}
