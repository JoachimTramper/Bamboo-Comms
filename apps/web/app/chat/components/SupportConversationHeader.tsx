"use client";

import type { SupportConversation } from "../types";

type Props = {
  conversation: SupportConversation;
};

function badgeClass(value: string) {
  switch (value) {
    case "OPEN":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESOLVED":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "CLOSED":
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
    case "URGENT":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "LOW":
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
}

export function SupportConversationHeader({ conversation }: Props) {
  const customerLabel =
    conversation.customer?.name ??
    conversation.customer?.email ??
    "Unknown customer";

  return (
    <div className="border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Support Conversation
          </div>
          <div className="text-lg font-semibold text-neutral-900">
            {conversation.subject ?? "Untitled conversation"}
          </div>
          <div className="mt-1 text-sm text-neutral-600">{customerLabel}</div>
          {conversation.customer?.company && (
            <div className="text-xs text-neutral-500">
              {conversation.customer.company}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full border px-2.5 py-1 font-semibold ${badgeClass(
              conversation.status,
            )}`}
          >
            {conversation.status}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 font-semibold ${badgeClass(
              conversation.priority,
            )}`}
          >
            {conversation.priority}
          </span>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-neutral-600">
            {conversation.assignee?.displayName ?? "Unassigned"}
          </span>
          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-500">
            {conversation.messageCount} messages
          </span>
        </div>
      </div>
    </div>
  );
}
