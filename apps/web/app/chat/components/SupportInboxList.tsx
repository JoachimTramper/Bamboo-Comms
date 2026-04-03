"use client";

import type { SupportConversation } from "../types";

type Props = {
  conversations: SupportConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading?: boolean;
};

function formatConversationPreview(conversation: SupportConversation) {
  const preview = conversation.latestMessagePreview?.content?.trim();
  if (preview) return preview;

  if (conversation.customer?.email) return conversation.customer.email;
  if (conversation.customer?.name) return conversation.customer.name;

  return "No messages yet";
}

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

export function SupportInboxList({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading = false,
}: Props) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-xs uppercase tracking-wide text-neutral-800">
          Support Inbox
        </h2>
        <span className="text-[11px] text-neutral-500">
          {loading ? "Loading..." : `${conversations.length} threads`}
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {conversations.map((conversation) => {
          const isActive = activeConversationId === conversation.id;
          const title =
            conversation.subject ??
            conversation.customer?.name ??
            conversation.customer?.email ??
            "Untitled conversation";

          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                isActive
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-neutral-200 bg-white hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-neutral-600">
                    {formatConversationPreview(conversation)}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500">
                  {conversation.messageCount}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                    conversation.status,
                  )}`}
                >
                  {conversation.status}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                    conversation.priority,
                  )}`}
                >
                  {conversation.priority}
                </span>
                <span className="truncate text-[11px] text-neutral-500">
                  {conversation.assignee?.displayName ?? "Unassigned"}
                </span>
                {conversation.isEscalated && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    Escalated
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {!loading && conversations.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">
            No support conversations yet
          </div>
        )}
      </div>
    </section>
  );
}
