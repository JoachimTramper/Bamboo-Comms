"use client";

import type {
  ConversationLifecycleAction,
  SupportConversation,
} from "../types";

type Props = {
  conversation: SupportConversation;
  meId: string;
  canManage: boolean;
  updatingStatus: boolean;
  updatingAssignment: boolean;
  onTransition: (action: ConversationLifecycleAction) => Promise<void> | void;
  onAssignToMe: () => Promise<void> | void;
  onUnassign: () => Promise<void> | void;
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

function nextActionsForStatus(
  status: SupportConversation["status"],
): Array<{ label: string; action: ConversationLifecycleAction }> {
  switch (status) {
    case "OPEN":
      return [{ label: "Mark Pending", action: "PENDING" }];
    case "PENDING":
      return [{ label: "Resolve", action: "RESOLVE" }];
    case "RESOLVED":
      return [
        { label: "Close", action: "CLOSE" },
        { label: "Reopen", action: "REOPEN" },
      ];
    case "CLOSED":
      return [{ label: "Reopen", action: "REOPEN" }];
    default:
      return [];
  }
}

function infoCard(title: string, value: string, hint?: string) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium text-neutral-900">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-neutral-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function SupportConversationMeta({
  conversation,
  meId,
  canManage,
  updatingStatus,
  updatingAssignment,
  onTransition,
  onAssignToMe,
  onUnassign,
}: Props) {
  const isAssignedToMe = conversation.assigneeId === meId;
  const statusActions = nextActionsForStatus(conversation.status);
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
    <div className="border-b border-neutral-200 bg-stone-50/90 px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Workflow
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {statusActions.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => onTransition(item.action)}
                disabled={!canManage || updatingStatus}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingStatus ? "Saving..." : item.label}
              </button>
            ))}

            {canManage &&
              (isAssignedToMe ? (
                <button
                  type="button"
                  onClick={onUnassign}
                  disabled={updatingAssignment}
                  className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingAssignment ? "Saving..." : "Unassign"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAssignToMe}
                  disabled={updatingAssignment}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingAssignment ? "Saving..." : "Assign To Me"}
                </button>
              ))}
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            Status changes follow the backend lifecycle rules. Agent selection is
            intentionally minimal here until a dedicated assignee picker exists.
          </div>
        </div>
      </div>
    </div>
  );
}
