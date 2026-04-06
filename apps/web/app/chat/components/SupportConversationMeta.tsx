"use client";

import type {
  SupportConversation,
} from "../types";

type Props = {
  conversation: SupportConversation;
};

function formatDate(value?: string | null) {
  if (!value) return "Not yet";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function infoCard(title: string, value: string, hint?: string) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/90 px-3 py-2.5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium leading-5 text-neutral-900">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-xs leading-5 text-neutral-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function SupportConversationMeta({ conversation }: Props) {
  const customerName =
    conversation.customer?.name ??
    conversation.customer?.email ??
    "Unknown customer";
  const customerHint = conversation.customer?.company
    ? [conversation.customer.company, conversation.customer.planTier]
        .filter(Boolean)
        .join(" - ")
    : conversation.customer?.planTier ?? undefined;

  return (
    <div className="border-b border-neutral-200 bg-stone-50/90 px-4 py-2.5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {infoCard("Customer", customerName, customerHint)}
        {infoCard(
          "Assignee",
          conversation.assignee?.displayName ?? "Unassigned",
          conversation.assignee?.email ?? "No owner yet",
        )}
        {infoCard(
          "Latest Activity",
          formatDate(conversation.lastMessageAt),
          `${conversation.messageCount} messages`,
        )}
        {infoCard(
          "First Response",
          formatDate(conversation.firstResponseAt),
          conversation.resolvedAt
            ? `Resolved ${formatDate(conversation.resolvedAt)}`
            : "Still active",
        )}
      </div>
    </div>
  );
}
