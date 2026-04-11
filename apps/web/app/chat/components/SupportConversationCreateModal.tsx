"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: {
    subject?: string;
    message: string;
  }) => Promise<void> | void;
};

export function SupportConversationCreateModal({
  open,
  loading = false,
  error = null,
  onClose,
  onSubmit,
}: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubject("");
      setMessage("");
      setTouched(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose, open]);

  if (!open) return null;

  const trimmedMessage = message.trim();
  const messageError =
    touched && !trimmedMessage ? "A support message is required." : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!trimmedMessage) return;

    await onSubmit({
      subject: subject.trim() || undefined,
      message: trimmedMessage,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-3 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-create-title"
        className="relative z-[91] w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 bg-white/80 px-5 py-4">
          <div>
            <h2
              id="support-create-title"
              className="text-base font-semibold text-neutral-900"
            >
              Start Support Conversation
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Send the first message that support should see in the inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-stone-100 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close support conversation modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block text-sm font-medium text-neutral-700">
            Subject
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Optional short summary"
              maxLength={200}
              disabled={loading}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            />
          </label>

          <label className="block text-sm font-medium text-neutral-700">
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Describe the issue you need help with."
              rows={6}
              maxLength={5000}
              disabled={loading}
              className="mt-1 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            />
          </label>

          {messageError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {messageError}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !trimmedMessage}
              className="rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
