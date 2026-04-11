"use client";

import type { SupportConversation } from "../types";

type Props = {
  conversation: SupportConversation;
};

function formatCustomerLabel(conversation: SupportConversation) {
  return (
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

export function SupportConversationHeader({ conversation }: Props) {
  const customerLabel = formatCustomerLabel(conversation);
  const assigneeLabel = conversation.assignee?.displayName ?? "Unassigned";

  return (
    <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-3 backdrop-blur-sm sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Support Conversation
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <div className="min-w-0 text-lg font-semibold leading-7 text-neutral-900">
              {conversation.subject ?? "Untitled conversation"}
            </div>
            <div className="text-sm font-medium text-neutral-600">
              {customerLabel}
            </div>
            {conversation.customer?.company && (
              <div className="text-xs text-neutral-500">
                {conversation.customer.company}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 shadow-sm">
              Assignee: {assigneeLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
              {conversation.messageCount} messages
            </span>
          </div>
          {conversation.isEscalated && (
            <div className="mt-2 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <span className="font-semibold">Escalated.</span>{" "}
              {conversation.escalationReason?.trim()
                ? conversation.escalationReason
                : "This conversation has been marked for human handoff."}
            </div>
          )}
          {conversation.isEscalated && conversation.escalationTarget && (
            <div className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-rose-700">
              Route: {conversation.escalationTarget.replaceAll("_", " ")}
            </div>
          )}
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2 self-start rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2 text-xs shadow-sm lg:justify-end">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold leading-none ${badgeClass(
              conversation.status,
            )}`}
          >
            {conversation.status}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold leading-none ${badgeClass(
              conversation.priority,
            )}`}
          >
            {conversation.priority}
          </span>
          {conversation.isEscalated && (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold leading-none text-rose-700">
              Escalated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
