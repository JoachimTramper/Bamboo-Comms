"use client";

import { useState, type KeyboardEvent } from "react";

type Props = {
  tags: string[];
  disabled?: boolean;
  saving?: boolean;
  onChange: (tags: string[]) => void;
};

function normalizeTag(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

export function TagManager({
  tags,
  disabled = false,
  saving = false,
  onChange,
}: Props) {
  const [draft, setDraft] = useState("");

  function commitTag() {
    const nextTag = normalizeTag(draft);
    if (!nextTag || tags.includes(nextTag)) {
      setDraft("");
      return;
    }

    onChange([...tags, nextTag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTag();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                disabled={disabled || saving}
                className="text-neutral-500 transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove tag ${tag}`}
              >
                x
              </button>
            </span>
          ))
        ) : (
          <div className="text-sm text-neutral-500">No tags yet.</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || saving}
          placeholder="Add a tag"
          className="min-w-[12rem] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
        />
        <button
          type="button"
          onClick={commitTag}
          disabled={disabled || saving || !draft.trim()}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add Tag"}
        </button>
      </div>
    </div>
  );
}
