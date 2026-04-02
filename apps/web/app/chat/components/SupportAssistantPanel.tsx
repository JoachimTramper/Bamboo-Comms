"use client";

type Props = {
  draft: string;
  generatedAt: string | null;
  instructions: string;
  loading: boolean;
  error: string | null;
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
  instructions,
  loading,
  error,
  onInstructionsChange,
  onGenerate,
  onUseDraft,
  onClearDraft,
}: Props) {
  const generatedLabel = formatGeneratedAt(generatedAt);

  return (
    <div className="border-b border-neutral-200 bg-white/90 px-4 py-4">
      <div className="rounded-2xl border border-indigo-100 bg-[linear-gradient(135deg,rgba(224,231,255,0.7),rgba(255,255,255,0.95))] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
              AI Assistant
            </div>
            <div className="mt-1 text-sm font-medium text-neutral-900">
              Generate a customer reply draft for this support thread
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              The draft is never sent automatically. Review it before use.
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Reply"}
          </button>
        </div>

        <div className="mt-4">
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
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-neutral-900">
              Draft Reply
            </div>
            {generatedLabel && (
              <div className="text-xs text-neutral-500">
                Generated {generatedLabel}
              </div>
            )}
          </div>

          {draft ? (
            <>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {draft}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
            </>
          ) : (
            <div className="mt-3 text-sm text-neutral-500">
              Generate a draft to preview an AI-written reply for this conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
