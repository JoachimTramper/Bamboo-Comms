"use client";

import { useEffect, useState } from "react";

type Props = {
  draft: string;
  generatedAt: string | null;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | null;
  confidenceHint?: string | null;
  instructions: string;
  loading: boolean;
  error: string | null;
  defaultOpen?: boolean;
  onInstructionsChange: (value: string) => void;
  onGenerate: () => Promise<void> | void;
  onUseDraft: () => void;
  onClearDraft: () => void;
};

function formatGeneratedAt(value: string | null) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function SupportAssistantPanel({
  draft,
  generatedAt,
  confidence,
  confidenceHint,
  instructions,
  loading,
  error,
  defaultOpen = false,
  onInstructionsChange,
  onGenerate,
  onUseDraft,
  onClearDraft,
}: Props) {
  const generatedLabel = formatGeneratedAt(generatedAt);
  const [open, setOpen] = useState(defaultOpen);
  const confidenceTone =
    confidence === "HIGH"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : confidence === "MEDIUM"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : confidence === "LOW"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-neutral-200 bg-neutral-50 text-neutral-600";

  useEffect(() => {
    setOpen(defaultOpen || !!draft || !!error);
  }, [defaultOpen, draft, error]);

  return (
    <div className="border-b border-slate-200 bg-white/90 px-4 py-2.5 sm:px-5">
      <div className="rounded-2xl border border-indigo-200 bg-[linear-gradient(135deg,rgba(224,231,255,0.9),rgba(255,255,255,0.98))] px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
              AI Assistant
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">
              Generate a customer reply draft for this support thread
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Support-only drafting tool. Nothing is sent automatically.
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
            >
              {open ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {open ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 font-medium text-indigo-700">
                Review before sending
              </span>
              {confidence ? (
                <span
                  className={`rounded-full border px-2.5 py-1 font-medium ${confidenceTone}`}
                >
                  Confidence: {confidence.toLowerCase()}
                </span>
              ) : null}
              {generatedLabel ? (
                <span className="text-neutral-500">
                  Generated {generatedLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Optional guidance
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                rows={2}
                placeholder="Example: Keep it short and offer one concrete next step."
                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-indigo-300"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={loading}
                  className="rounded-full border border-indigo-200 bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Generating Reply..." : "Generate Reply"}
                </button>
              </div>
            </div>

            {loading && (
              <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                  <div>
                    <div className="text-sm font-medium text-indigo-900">
                      Generating a reply draft
                    </div>
                    <div className="mt-1 text-sm text-indigo-700">
                      Reviewing the conversation context and preparing text for
                      the composer.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-indigo-200/70 bg-white/95 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-neutral-900">
                  Draft Reply
                </div>
                <div className="text-xs text-neutral-500">Preview only</div>
              </div>

              {draft ? (
                <>
                  {confidenceHint ? (
                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-sm ${confidenceTone}`}
                    >
                      {confidenceHint}
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-2xl border border-neutral-200 bg-stone-50 px-4 py-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      Draft preview
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                      {draft}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onUseDraft}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      Use Draft In Composer
                    </button>
                    <button
                      type="button"
                      onClick={onClearDraft}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    Use Draft In Composer only copies the draft into the message
                    composer. It does not send the message.
                  </div>
                </>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-neutral-200 bg-stone-50 px-4 py-4 text-sm text-neutral-500">
                  {loading
                    ? "The draft preview will appear here when generation finishes."
                    : "Generate a draft to preview an AI-written reply for this conversation."}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100/70 bg-white/70 px-3 py-2 text-sm text-neutral-600">
            <span>
              {draft
                ? "A draft reply is ready to review."
                : "Assistant tools are hidden until needed."}
            </span>
            {generatedLabel ? (
              <span className="text-xs text-neutral-500">
                Generated {generatedLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
