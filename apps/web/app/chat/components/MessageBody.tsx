"use client";

import type { RefObject } from "react";
import type { Message } from "../types";
import { resolveFileUrl } from "@/lib/files";
import { MessageReactionsBar } from "./MessageReactionsBar";
import { MessageActions } from "./MessageActions";

type Props = {
  m: Message;

  // layout / ownership
  isMine: boolean;
  isDirect: boolean;
  isDmMine: boolean;

  // state flags
  isDeleted: boolean;
  isEdited: boolean;
  isEditing: boolean;

  // edit flow
  editText: string;
  setEditText: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;

  // failed retry
  onRetry?: () => void;

  // context
  channelId: string;
  meId: string;

  // menu + reactions
  menuOpen: boolean;
  hasReactions: boolean;
  closeMenu: () => void;
  menuRef: RefObject<HTMLDivElement | null>;

  // DM “seen”
  isLastOwn?: boolean;
  showSeen?: boolean;

  // actions
  onStartEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
};

export function MessageBody({
  m,
  isMine,
  isDirect,
  isDmMine,
  isDeleted,
  isEdited,
  isEditing,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
  onRetry,
  channelId,
  meId,
  menuOpen,
  hasReactions,
  closeMenu,
  isLastOwn,
  showSeen,
  onStartEdit,
  onDelete,
  onReply,
  menuRef,
}: Props) {
  // ---- Deleted ----
  if (isDeleted) {
    return (
      <div className="w-full text-sm text-gray-400 italic">
        Message deleted
        {m.deletedBy?.displayName ? ` by ${m.deletedBy.displayName}` : ""}
      </div>
    );
  }

  // ---- Failed ----
  if (m.failed) {
    return (
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
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ---- Reply preview (DM + channels) ----
  const ReplyPreview = m.parent ? (
    <div
      className={`w-full mt-1 mb-1 flex ${isDmMine ? "justify-end" : "justify-start"}`}
    >
      <div className="max-w-full rounded-lg border border-neutral-200/70 bg-white/80 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur-sm">
        <div className="font-medium text-neutral-800 truncate">
          Replied to {m.parent.author.displayName}
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
  ) : null;

  // ---- Editing ----
  if (isEditing) {
    return (
      <div className="w-full mt-1 flex flex-col gap-2">
        {ReplyPreview}
        <div className="flex items-center gap-2">
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
      </div>
    );
  }

  // ---- Normal content ----
  const hasText = !!m.content?.trim();
  const hasAttachments = (m.attachments?.length ?? 0) > 0;

  return (
    <>
      {ReplyPreview}

      <div ref={menuRef} className="group">
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
            {/* Sent/Seen */}
            {isDirect && isDmMine && !!isLastOwn && (
              <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 mb-1">
                <span aria-hidden>{showSeen ? "✓✓" : "✓"}</span>
                <span className="hidden sm:inline">
                  {showSeen ? "Seen" : "Sent"}
                </span>
              </div>
            )}

            {/* bubble (only if there is text) */}
            {hasText && (
              <div
                className={[
                  "inline-flex w-fit max-w-full",
                  "text-sm whitespace-pre-wrap break-words",
                  "px-3 py-2 rounded-2xl transition-shadow",
                  "text-neutral-900",
                  isMine
                    ? "bg-teal-200 shadow"
                    : "bg-white border border-gray-200 shadow",
                ].join(" ")}
              >
                {m.content}
                {isEdited && (
                  <span className="ml-2 text-xs text-gray-400 italic">
                    (edited)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* actions */}
        <MessageActions
          isMine={isMine}
          isDeleted={false}
          failed={m.failed}
          menuOpen={menuOpen}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          onReply={onReply}
          onCloseMenu={closeMenu}
        />
      </div>

      {/* Attachments */}
      {hasAttachments ? (
        <div
          className={`w-full mt-2 flex flex-col gap-1 ${
            isDmMine ? "items-end" : "items-start"
          }`}
        >
          {m.attachments!.map((att) => {
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

      {/* reactions row (below text + attachments) */}
      {!isDeleted && !m.failed && (
        <div
          data-menu-safe="true"
          className={[
            hasAttachments ? "mt-2" : "mt-1",
            // only show space when open/has reactions on mobile,
            // desktop visibility is handled inside the bar via group-hover
            menuOpen || hasReactions ? "flex" : "hidden md:flex",
            isDmMine ? "justify-end" : "justify-start",
          ].join(" ")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
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
    </>
  );
}
