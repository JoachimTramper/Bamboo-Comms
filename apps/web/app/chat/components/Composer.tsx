"use client";
import React, { useMemo, useState, useRef } from "react";
import { Paperclip, X } from "lucide-react";

type ReplyTarget = {
  id: string;
  authorName: string;
  content?: string | null;
};

type MentionCandidate = {
  id: string;
  displayName: string;
};

type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: (files: File[]) => void;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  mentionCandidates?: MentionCandidate[];
};

export function Composer({
  value,
  onChange,
  onSend,
  replyTo,
  onCancelReply,
  mentionCandidates = [],
}: ComposerProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionList, setShowMentionList] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = !!value.trim() || files.length > 0;

  function handleChange(v: string) {
    onChange(v);

    if (!mentionCandidates.length) {
      setShowMentionList(false);
      return;
    }

    const at = v.lastIndexOf("@");
    if (at === -1) {
      setShowMentionList(false);
      setMentionQuery("");
      return;
    }

    const q = v.slice(at + 1);

    if (q === "") {
      setMentionQuery("");
      setShowMentionList(true); // only '@' → show all candidates
      return;
    }

    // only a–z0–9_ in the query
    if (/^[A-Za-z0-9_]+$/.test(q)) {
      setMentionQuery(q);
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
      setMentionQuery("");
    }
  }

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionList) return [];
    if (!mentionQuery) return mentionCandidates.slice(0, 20);

    const q = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((u) => u.displayName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [showMentionList, mentionQuery, mentionCandidates]);

  function handleSelectMention(user: MentionCandidate) {
    const v = value;
    const at = v.lastIndexOf("@");
    if (at === -1) return;

    const before = v.slice(0, at);
    const after = v.slice(at + 1 + mentionQuery.length);

    const next = `${before}@${user.displayName} ${after}`;
    onChange(next);
    setShowMentionList(false);
    setMentionQuery("");
  }

  function handleSendClick() {
    if (!canSend) return;

    setShowMentionList(false);
    setMentionQuery("");

    onSend(files);
    setFiles([]); // reset selected files after sending
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendClick();
    } else if (e.key === "Escape") {
      setShowMentionList(false);
      setMentionQuery("");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
    // reset so you can select the same file again later
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="border-t bg-neutral-200">
      {/* Reply bar above the input */}
      {replyTo && (
        <div className="px-3 pt-2 pb-1 text-xs text-gray-600 flex items-start gap-2 border-b">
          <div className="flex-1 min-w-0">
            <div className="font-medium">Replying to {replyTo.authorName}</div>
            {replyTo.content && (
              <div className="truncate text-gray-500 italic">
                {replyTo.content}
              </div>
            )}
          </div>
          {onCancelReply && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 text-xs px-1"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      )}

      {/* Selected files preview */}
      {files.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2 text-xs text-gray-700">
          {files.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            return (
              <div
                key={idx}
                className="flex items-center gap-2 border rounded px-2 py-1 bg-gray-50"
              >
                <span className="text-[10px]">{isImage ? "🖼" : "📄"}</span>
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input + send button + attach */}
      <div className="p-3 flex gap-2 shrink-0 items-center">
        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Button attach files */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 flex items-center justify-center rounded-full border bg-white hover:bg-gray-50 text-gray-600"
          title="Attach files"
        >
          <Paperclip size={18} strokeWidth={2} />
        </button>

        <div className="relative flex-1">
          {/* Mention dropdown */}
          {showMentionList && filteredMentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-56 max-h-48 overflow-y-auto rounded border bg-white shadow text-sm z-10">
              {filteredMentionCandidates.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                  onClick={() => handleSelectMention(u)}
                >
                  {u.displayName}
                </button>
              ))}
            </div>
          )}

          <input
            className="border rounded w-full p-2"
            placeholder="Type a message…"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          className="border rounded px-4"
          disabled={!canSend}
          onClick={handleSendClick}
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}
