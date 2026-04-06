"use client";

import { useEffect, useState } from "react";
import {
  createInternalNote,
  deleteInternalNote,
  listInternalNotes,
} from "@/lib/api";
import type { InternalNote as InternalNoteItem } from "../types";

type Props = {
  conversationId: string;
  disabled?: boolean;
};

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function InternalNotes({
  conversationId,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<InternalNoteItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setNotes([]);
    setDraft("");
    setLoading(false);
    setSaving(false);
    setDeletingId(null);
    setError(null);
  }, [conversationId]);

  useEffect(() => {
    if (!open || disabled) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await listInternalNotes(conversationId);
        if (!cancelled) {
          setNotes(items);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ??
              e?.message ??
              "Failed to load internal notes",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, disabled, conversationId]);

  async function handleCreate() {
    const content = draft.trim();
    if (!content) return;

    try {
      setSaving(true);
      setError(null);
      const created = await createInternalNote(conversationId, content);
      setNotes((prev) => [created, ...prev]);
      setDraft("");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to create internal note",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    try {
      setDeletingId(noteId);
      setError(null);
      await deleteInternalNote(conversationId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to delete internal note",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            Internal Notes
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            Private collaboration space for agents on this support conversation.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {open ? "Hide Notes" : "Open Notes"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              disabled={disabled || saving}
              placeholder="Add a private note for other agents"
              className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                Only agents can view and manage these notes.
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={disabled || saving || !draft.trim()}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="rounded-xl border border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">
                Loading notes...
              </div>
            ) : notes.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">
                No internal notes yet.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {note.author.displayName}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {formatTimestamp(note.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      disabled={disabled || deletingId === note.id}
                      className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === note.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
                    {note.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
