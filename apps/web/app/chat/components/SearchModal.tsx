"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ChannelSearch } from "./ChannelSearch";
import type { ChannelWithUnread } from "../types";

type Props = {
  open: boolean;
  activeChannel?: ChannelWithUnread;
  dmPeerName?: string | null;
  channelId: string | null;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
};

export function SearchModal({
  open,
  activeChannel,
  dmPeerName,
  channelId,
  onClose,
  onJumpToMessage,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !channelId) return null;

  const label = activeChannel?.isDirect
    ? (dmPeerName ?? "this conversation")
    : `#${activeChannel?.name ?? "channel"}`;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-neutral-200 shadow-xl border overflow-hidden search-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <div className="text-xs font-medium text-gray-500 truncate">
            Search in {label}
          </div>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 max-h-[70vh] overflow-y-auto">
          <ChannelSearch
            channelId={channelId}
            onJumpToMessage={onJumpToMessage}
          />
        </div>
      </div>
    </div>
  );
}
