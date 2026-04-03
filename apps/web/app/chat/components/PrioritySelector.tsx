"use client";

import type { ConversationPriority } from "../types";

const PRIORITY_OPTIONS: ConversationPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

const PRIORITY_STYLES: Record<ConversationPriority, string> = {
  LOW: "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
  NORMAL: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  URGENT: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

type Props = {
  value: ConversationPriority;
  disabled?: boolean;
  saving?: boolean;
  onChange: (value: ConversationPriority) => void;
};

export function PrioritySelector({
  value,
  disabled = false,
  saving = false,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITY_OPTIONS.map((option) => {
        const isActive = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            disabled={disabled || saving}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? PRIORITY_STYLES[option]
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {saving && isActive ? "Saving..." : option}
          </button>
        );
      })}
    </div>
  );
}
