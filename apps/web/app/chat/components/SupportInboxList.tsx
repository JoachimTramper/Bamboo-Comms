"use client";

import type {
  ConversationPriority,
  ConversationStatus,
  SupportConversation,
} from "../types";

type Props = {
  conversations: SupportConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  statusFilter: ConversationStatus | "ALL";
  priorityFilter: ConversationPriority | "ALL";
  assignedToMeOnly: boolean;
  onStatusFilterChange: (value: ConversationStatus | "ALL") => void;
  onPriorityFilterChange: (value: ConversationPriority | "ALL") => void;
  onAssignedToMeOnlyChange: (value: boolean) => void;
  loading?: boolean;
};

function formatConversationPreview(conversation: SupportConversation) {
  const preview = conversation.latestMessagePreview?.content?.trim();
  if (preview) return preview;

  if (conversation.customer?.email) return conversation.customer.email;
  if (conversation.customer?.name) return conversation.customer.name;

  return "No messages yet";
}

function formatConversationTitle(conversation: SupportConversation) {
  return (
    conversation.subject?.trim() ||
    conversation.customer?.name?.trim() ||
    conversation.customer?.email?.trim() ||
    "Unknown customer"
  );
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
  statusFilter,
  priorityFilter,
  assignedToMeOnly,
  onStatusFilterChange,
  onPriorityFilterChange,
  onAssignedToMeOnlyChange,
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

      <div className="mt-2 rounded-xl border border-stone-200 bg-white/90 p-2">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(
                  event.target.value as ConversationStatus | "ALL",
                )
              }
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>

          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Priority
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              value={priorityFilter}
              onChange={(event) =>
                onPriorityFilterChange(
                  event.target.value as ConversationPriority | "ALL",
                )
              }
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-stone-50 px-2 py-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              checked={assignedToMeOnly}
              onChange={(event) =>
                onAssignedToMeOnlyChange(event.target.checked)
              }
            />
            <span className="font-medium">Assigned to me</span>
          </label>
        </div>

        <div className="mt-2 text-[11px] text-neutral-500">
          Sorted by latest activity
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {conversations.map((conversation) => {
          const isActive = activeConversationId === conversation.id;
          const title = formatConversationTitle(conversation);
          const assigneeLabel = conversation.assignee?.displayName ?? "Unassigned";

          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              aria-pressed={isActive}
              className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={`truncate text-sm font-medium ${
                      isActive ? "text-indigo-900" : "text-neutral-900"
                    }`}
                  >
                    {title}
                  </div>
                  <div
                    className={`mt-1 line-clamp-2 text-xs ${
                      isActive ? "text-indigo-800" : "text-neutral-600"
                    }`}
                  >
                    {formatConversationPreview(conversation)}
                  </div>
                </div>
                <div
                  className={`inline-flex min-w-[2rem] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${
                    isActive
                      ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                      : "border-neutral-200 bg-white text-neutral-500"
                  }`}
                >
                  {conversation.messageCount}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${badgeClass(
                    conversation.status,
                  )}`}
                >
                  {conversation.status}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${badgeClass(
                    conversation.priority,
                  )}`}
                >
                  {conversation.priority}
                </span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] leading-none text-neutral-600">
                  {assigneeLabel}
                </span>
                {conversation.isEscalated && (
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold leading-none text-rose-700">
                    Escalated
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {!loading && conversations.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">
            No support conversations match the current filters.
          </div>
        )}
      </div>
    </section>
  );
}
