"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ConversationPriority,
  ConversationStatus,
  SupportConversation,
} from "../types";

type Props = {
  conversations: SupportConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  statusFilter?: ConversationStatus | "ALL";
  priorityFilter?: ConversationPriority | "ALL";
  assignedToMeOnly?: boolean;
  onStatusFilterChange?: (value: ConversationStatus | "ALL") => void;
  onPriorityFilterChange?: (value: ConversationPriority | "ALL") => void;
  onAssignedToMeOnlyChange?: (value: boolean) => void;
  title?: string;
  showFilters?: boolean;
  emptyStateMessage?: string;
  loading?: boolean;
  error?: string | null;
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

function sectionHeaderClass(expanded: boolean, muted = false) {
  if (muted) {
    return expanded
      ? "border-neutral-300 bg-neutral-100 text-neutral-700"
      : "border-neutral-200 bg-neutral-50 text-neutral-600";
  }

  return expanded
    ? "border-indigo-200 bg-indigo-50 text-indigo-800"
    : "border-neutral-200 bg-white text-neutral-700";
}

export function SupportInboxList({
  conversations,
  activeConversationId,
  onSelectConversation,
  statusFilter = "ALL",
  priorityFilter = "ALL",
  assignedToMeOnly = false,
  onStatusFilterChange = () => {},
  onPriorityFilterChange = () => {},
  onAssignedToMeOnlyChange = () => {},
  title = "Support Inbox",
  showFilters = true,
  emptyStateMessage = "No support conversations match the current filters.",
  loading = false,
  error = null,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const closedSectionRef = useRef<HTMLDivElement | null>(null);
  const [openExpanded, setOpenExpanded] = useState(true);
  const [closedExpanded, setClosedExpanded] = useState(false);
  const grouped = useMemo(() => {
    if (!showFilters) {
      return {
        active: conversations,
        closed: [] as SupportConversation[],
      };
    }

    return {
      active: conversations.filter(
        (conversation) => conversation.status !== "CLOSED",
      ),
      closed: conversations.filter(
        (conversation) => conversation.status === "CLOSED",
      ),
    };
  }, [conversations, showFilters]);

  const activeConversationIsClosed = grouped.closed.some(
    (conversation) => conversation.id === activeConversationId,
  );
  const activeConversationIsOpen = grouped.active.some(
    (conversation) => conversation.id === activeConversationId,
  );
  const openUnreadCount = grouped.active.reduce(
    (total, conversation) => total + (conversation.unread ?? 0),
    0,
  );
  const closedUnreadCount = grouped.closed.reduce(
    (total, conversation) => total + (conversation.unread ?? 0),
    0,
  );

  useEffect(() => {
    if (statusFilter === "CLOSED" || activeConversationIsClosed) {
      setClosedExpanded(true);
    }
  }, [activeConversationIsClosed, statusFilter]);

  useEffect(() => {
    if (!activeConversationIsOpen) return;
    setOpenExpanded(true);
  }, [activeConversationIsOpen]);

  useEffect(() => {
    if (!closedExpanded) return;
    if (!(statusFilter === "CLOSED" || activeConversationIsClosed)) return;

    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      const section = closedSectionRef.current;
      if (!container || !section) return;

      const containerRect = container.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();

      if (
        sectionRect.top < containerRect.top ||
        sectionRect.bottom > containerRect.bottom
      ) {
        section.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    });
  }, [activeConversationIsClosed, closedExpanded, statusFilter]);

  function renderConversationItem(
    conversation: SupportConversation,
    options?: { muted?: boolean },
  ) {
    const isActive = activeConversationId === conversation.id;
    const title = formatConversationTitle(conversation);
    const assigneeLabel = conversation.assignee?.displayName ?? "Unassigned";
    const muted = options?.muted ?? false;
    const unread = conversation.unread ?? 0;
    const showUnreadAlert = unread > 0 && !isActive;

    return (
      <button
        key={conversation.id}
        type="button"
        onClick={() => onSelectConversation(conversation.id)}
        aria-pressed={isActive}
        className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
          isActive
            ? "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
            : muted
              ? "border-neutral-200 bg-neutral-50/80 hover:border-neutral-300 hover:bg-neutral-100"
              : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={`truncate text-sm font-medium ${
                isActive
                  ? "text-indigo-900"
                  : muted
                    ? "text-neutral-700"
                    : "text-neutral-900"
              }`}
            >
              {title}
            </div>
            <div
              className={`mt-1 line-clamp-2 text-xs ${
                isActive
                  ? "text-indigo-800"
                  : muted
                    ? "text-neutral-500"
                    : "text-neutral-600"
              }`}
            >
              {formatConversationPreview(conversation)}
            </div>
          </div>
          <div
            className={`inline-flex min-w-[2rem] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${
              showUnreadAlert
                ? "border-rose-200 bg-rose-500 text-white"
                : isActive
                ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
            aria-label={
              showUnreadAlert
                ? `${unread} unread messages`
                : `${conversation.messageCount} messages`
            }
          >
            {showUnreadAlert ? unread : conversation.messageCount}
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
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-xs uppercase tracking-wide text-neutral-800">
          {title}
        </h2>
        <span className="text-[11px] text-neutral-500">
          {loading ? "Loading..." : `${conversations.length} threads`}
        </span>
      </div>

      {showFilters && (
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
      )}

      <div
        ref={scrollContainerRef}
        className="mt-2 min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto"
      >
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-5 text-sm text-neutral-600">
            {emptyStateMessage}
          </div>
        )}

        {showFilters && conversations.length > 0 ? (
          <>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setOpenExpanded((value) => !value)}
                aria-expanded={openExpanded}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${sectionHeaderClass(
                  openExpanded,
                )}`}
              >
                <span>Open</span>
                <span className="flex items-center gap-2">
                  {!openExpanded && openUnreadCount > 0 && (
                    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-rose-200 bg-rose-500 px-2 py-1 text-[10px] font-semibold leading-none text-white">
                      {openUnreadCount}
                    </span>
                  )}
                  <span>{grouped.active.length}</span>
                </span>
              </button>
              {openExpanded &&
                (grouped.active.length > 0 ? (
                  grouped.active.map((conversation) =>
                    renderConversationItem(conversation),
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">
                    No open support conversations match the current filters.
                  </div>
                ))}
            </div>

            <div ref={closedSectionRef} className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setClosedExpanded((value) => !value)}
                aria-expanded={closedExpanded}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${sectionHeaderClass(
                  closedExpanded,
                  true,
                )}`}
              >
                <span>Closed</span>
                <span className="flex items-center gap-2">
                  {!closedExpanded && closedUnreadCount > 0 && (
                    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-rose-200 bg-rose-500 px-2 py-1 text-[10px] font-semibold leading-none text-white">
                      {closedUnreadCount}
                    </span>
                  )}
                  <span>{grouped.closed.length}</span>
                </span>
              </button>

              {closedExpanded &&
                (grouped.closed.length > 0 ? (
                  <div className="space-y-2">
                    {grouped.closed.map((conversation) =>
                      renderConversationItem(conversation, { muted: true }),
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                    No closed support conversations match the current filters.
                  </div>
                ))}
            </div>
          </>
        ) : !showFilters ? (
          conversations.map((conversation) => {
            return renderConversationItem(conversation);
          })
        ) : null
        }

      </div>
    </section>
  );
}
