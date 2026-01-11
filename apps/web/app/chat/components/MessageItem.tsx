"use client";

import { useRef, useState } from "react";
import type React from "react";
import type { Message } from "../types";
import { Avatar } from "./Avatar";
import { resolveFileUrl } from "@/lib/files";
import { MessageReactionsBar } from "./MessageReactionsBar";
import { MessageActions } from "./MessageActions";

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

  return (
    <div
      className="group py-px rounded-md hover:bg-gray-50"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {isDirect ? (
        <div
          className={`flex items-start gap-3 ${isDmMine ? "flex-row-reverse" : ""}`}
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

            {/* Reply preview */}
            {m.parent && !isDeleted && (
              <div
                className={`w-full mt-1 mb-1 flex ${isDmMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-full rounded-lg border border-neutral-200/70 bg-white/80 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur-sm">
                  <div className="font-medium text-neutral-800 truncate">
                    Replying to {m.parent.author.displayName}
                  </div>
                  {m.parent.content && (
                    <div className="text-[11px] text-neutral-500">
                      {m.parent.content.length > 80
                        ? `${m.parent.content.slice(0, 80)}…`
                        : m.parent.content}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content / Editing / Failed / Deleted */}
            {isDeleted ? (
              <div className="w-full text-sm text-gray-400 italic">
                Message deleted
                {m.deletedBy?.displayName
                  ? ` by ${m.deletedBy.displayName}`
                  : ""}
              </div>
            ) : m.failed ? (
              <div
                className={`w-full mt-1 flex ${isDmMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-full">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex flex-col items-start max-w-full text-sm px-3 py-2 rounded-2xl border shadow-sm bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 text-left"
                    title="Tap to retry sending this message"
                  >
                    <div className="font-semibold text-red-700 mb-0.5">
                      ⚠ Failed to send — tap to retry
                    </div>
                    {m.content && (
                      <div className="whitespace-pre-wrap break-words">
                        {m.content}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="w-full mt-1 flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm flex-1"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit();
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  autoFocus
                />
                <button
                  className="text-sm border rounded px-2 py-1 hover:bg-gray-100"
                  onClick={onSaveEdit}
                >
                  Save
                </button>
                <button
                  className="text-sm border rounded px-2 py-1 hover:bg-gray-100"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {/* bubble + ticks + reactions */}
                <div
                  className={`w-full mt-1 flex flex-col gap-[2px] ${
                    isDmMine ? "items-end" : "items-start"
                  }`}
                >
                  {/* bubble row */}
                  <div
                    className={`flex items-end gap-2 ${
                      isDmMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Sent/Seen — only for MY last message in DM */}
                    {isDmMine && !isDeleted && isLastOwn && (
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 mb-1">
                        <span aria-hidden>{showSeen ? "✓✓" : "✓"}</span>
                        <span className="hidden sm:inline">
                          {showSeen ? "Seen" : "Sent"}
                        </span>
                      </div>
                    )}

                    {/* bubble */}
                    <div
                      className={[
                        "inline-flex w-fit max-w-full",
                        "text-sm whitespace-pre-wrap break-words",
                        "px-3 py-2 rounded-2xl transition-shadow",
                        isMine
                          ? "bg-teal-200 shadow"
                          : "bg-white border border-gray-200 shadow",
                      ].join(" ")}
                    >
                      {m.content}
                    </div>
                  </div>

                  {/* reactions row (DM) */}
                  {!isDeleted && !m.failed && (
                    <div
                      className={[
                        "mt-[2px] flex overflow-hidden transition-[max-height,opacity] duration-150",
                        isDmMine ? "justify-end" : "justify-start",
                        menuOpen || hasReactions
                          ? "max-h-24 opacity-100"
                          : "max-h-0 opacity-0 md:group-hover:max-h-24 md:group-hover:opacity-100",
                      ].join(" ")}
                    >
                      <MessageReactionsBar
                        message={m}
                        meId={meId}
                        channelId={channelId}
                        forceShow={menuOpen}
                        isMine={isDmMine}
                      />
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {!isDeleted && !m.failed && m.attachments?.length ? (
                  <div
                    className={`w-full mt-2 flex flex-col gap-1 ${
                      isDmMine ? "items-end" : "items-start"
                    }`}
                  >
                    {m.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith("image/");
                      const url = resolveFileUrl(att.url);

                      return (
                        <div
                          key={att.id}
                          className="inline-flex items-center gap-2 text-xs text-gray-600"
                        >
                          {isImage ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="border rounded-md overflow-hidden max-w-xs hover:border-gray-400"
                            >
                              <img
                                src={url}
                                alt={att.fileName}
                                className="max-h-40 w-auto object-cover block"
                              />
                            </a>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={[
                                "inline-flex items-center gap-2 px-2 py-1 border rounded-md hover:bg-gray-50",
                                isDmMine ? "justify-end text-right" : "",
                              ].join(" ")}
                            >
                              <span className="text-[11px] font-medium truncate max-w-[10rem]">
                                {att.fileName}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {(att.size / 1024).toFixed(1)} KB
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* actions (shared component) */}
                <MessageActions
                  isMine={isMine}
                  isDeleted={isDeleted}
                  failed={m.failed}
                  menuOpen={menuOpen}
                  onStartEdit={onStartEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  onCloseMenu={closeMenu}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        // fallback (non-DM)
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

            {/* message content */}
            <div
              className={[
                "mt-1 inline-flex w-fit max-w-full",
                "text-sm whitespace-pre-wrap break-words",
                "px-3 py-2 rounded-2xl",
                isMine
                  ? "bg-teal-200 shadow"
                  : "bg-white border border-gray-200 shadow",
              ].join(" ")}
            >
              {m.content}
            </div>

            {/* reactions (non-DM) */}
            {!isDeleted && !m.failed && (
              <div
                className={[
                  "mt-[2px] flex justify-start overflow-hidden transition-[max-height,opacity] duration-150",
                  menuOpen || hasReactions
                    ? "max-h-24 opacity-100"
                    : "max-h-0 opacity-0 md:group-hover:max-h-24 md:group-hover:opacity-100",
                ].join(" ")}
              >
                <MessageReactionsBar
                  message={m}
                  meId={meId}
                  channelId={channelId}
                  forceShow={menuOpen}
                  isMine={false}
                />
              </div>
            )}

            {/* actions (shared component) */}
            <MessageActions
              isMine={isMine}
              isDeleted={isDeleted}
              failed={m.failed}
              menuOpen={menuOpen}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onReply={onReply}
              onCloseMenu={closeMenu}
            />
          </div>

          <div />
        </div>
      )}
    </div>
  );
}
