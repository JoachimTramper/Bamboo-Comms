"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
};

export function InternalNotes({ disabled = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            Internal Notes
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            Entry point only for Step 15. Private note storage and timeline
            support are not wired yet.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {open ? "Hide Entry" : "Add Internal Note"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <textarea
            disabled
            rows={4}
            placeholder="Internal notes will be enabled in a later step."
            className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 outline-none"
          />
          <div className="text-xs text-neutral-500">
            Placeholder only. This does not persist or send any note content.
          </div>
        </div>
      ) : null}
    </div>
  );
}
