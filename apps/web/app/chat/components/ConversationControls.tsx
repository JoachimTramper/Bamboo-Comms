"use client";

import { useEffect, useState } from "react";

import type {
  ConversationLifecycleAction,
  ConversationPriority,
  SupportConversation,
} from "../types";
import { PrioritySelector } from "./PrioritySelector";
import { TagManager } from "./TagManager";
import { InternalNotes } from "./InternalNotes";

type Props = {
  conversation: SupportConversation;
  me: {
    id: string;
    displayName: string;
  };
  canManage: boolean;
  updatingStatus: boolean;
  updatingAssignment: boolean;
  updatingPriority: boolean;
  updatingTags: boolean;
  updatingEscalation: boolean;
  onTransition: (action: ConversationLifecycleAction) => Promise<void> | void;
  onAssign: (assigneeId?: string | null) => Promise<void> | void;
  onPriorityChange: (priority: ConversationPriority) => Promise<void> | void;
  onTagsChange: (tags: string[]) => Promise<void> | void;
  onEscalationChange: (next: {
    isEscalated: boolean;
    escalationReason?: string | null;
  }) => Promise<void> | void;
};

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

function sectionLabel(label: string, hint: string) {
  return (
    <div>
      <div className="text-sm font-semibold text-neutral-900">{label}</div>
      <div className="mt-1 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}

export function ConversationControls({
  conversation,
  me,
  canManage,
  updatingStatus,
  updatingAssignment,
  updatingPriority,
  updatingTags,
  updatingEscalation,
  onTransition,
  onAssign,
  onPriorityChange,
  onTagsChange,
  onEscalationChange,
}: Props) {
  const [escalationReasonDraft, setEscalationReasonDraft] = useState(
    conversation.escalationReason ?? "",
  );
  const [open, setOpen] = useState(false);
  const statusActions = nextActionsForStatus(conversation.status);
  const assignmentOptions = [
    { value: "", label: "Unassigned" },
    { value: me.id, label: `${me.displayName} (Me)` },
    ...(conversation.assignee &&
    conversation.assignee.id !== me.id &&
    conversation.assignee.id !== ""
      ? [
          {
            value: conversation.assignee.id,
            label: conversation.assignee.displayName,
          },
        ]
      : []),
  ];

  useEffect(() => {
    setEscalationReasonDraft(conversation.escalationReason ?? "");
  }, [
    conversation.id,
    conversation.isEscalated,
    conversation.escalationReason,
  ]);

  useEffect(() => {
    setOpen(false);
  }, [conversation.id]);

  return (
    <div className="border-b border-slate-200 bg-white/85 px-4 py-2.5 backdrop-blur-sm">
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.92))] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Conversation Management
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              Workflow controls for this support thread. Changes update the live
              conversation record only.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-neutral-600 shadow-sm">
                Assignee: {conversation.assignee?.displayName ?? "Unassigned"}
              </div>
              <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
                Status: {conversation.status}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100"
            >
              {open ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {open ? (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/55 p-4 shadow-sm">
                {sectionLabel(
                  "Workflow",
                  "Status transitions continue to follow the backend lifecycle rules.",
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusActions.length > 0 ? (
                    statusActions.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => onTransition(item.action)}
                        disabled={!canManage || updatingStatus}
                        className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingStatus ? "Saving..." : item.label}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-500">
                      No additional status actions are available right now.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-4 shadow-sm">
                {sectionLabel(
                  "Assignment",
                  "Improved incrementally with a compact assignee selector and quick actions.",
                )}
                <div className="mt-3 rounded-2xl border border-sky-200 bg-white/90 p-3">
                  <div className="text-xs font-medium text-neutral-500">
                    Current assignee
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {conversation.assignee?.displayName ?? "Unassigned"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {conversation.assignee?.email ??
                      "No agent owns this thread yet."}
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    value={conversation.assigneeId ?? ""}
                    onChange={(event) => onAssign(event.target.value || null)}
                    disabled={!canManage || updatingAssignment}
                    className="min-w-[13rem] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                  >
                    {assignmentOptions.map((option) => (
                      <option
                        key={option.value || "unassigned"}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onAssign(me.id)}
                    disabled={!canManage || updatingAssignment}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingAssignment ? "Saving..." : "Assign To Me"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssign(null)}
                    disabled={!canManage || updatingAssignment}
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Unassign
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-4 shadow-sm">
                {sectionLabel(
                  "Priority",
                  "Priority updates are persisted immediately on the conversation.",
                )}
                <div className="mt-3">
                  <PrioritySelector
                    value={conversation.priority}
                    disabled={!canManage}
                    saving={updatingPriority}
                    onChange={onPriorityChange}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/55 p-4 shadow-sm">
                {sectionLabel(
                  "Tags",
                  "Use lightweight tags to classify the thread without changing chat behavior.",
                )}
                <div className="mt-3">
                  <TagManager
                    tags={conversation.tags ?? []}
                    disabled={!canManage}
                    saving={updatingTags}
                    onChange={onTagsChange}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/55 p-4 shadow-sm xl:col-span-2">
                {sectionLabel(
                  "Escalation",
                  "Manual human handoff flag for cases that need extra review. No automatic routing or notifications yet.",
                )}
                <div className="mt-3 space-y-3">
                  <textarea
                    value={escalationReasonDraft}
                    onChange={(event) =>
                      setEscalationReasonDraft(event.target.value)
                    }
                    disabled={!canManage || updatingEscalation}
                    rows={3}
                    placeholder="Optional reason for escalation"
                    className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      onClick={() =>
                        onEscalationChange({
                          isEscalated: true,
                          escalationReason: escalationReasonDraft,
                        })
                      }
                      disabled={!canManage || updatingEscalation}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingEscalation
                        ? "Saving..."
                        : conversation.isEscalated
                          ? "Update Escalation"
                          : "Escalate Conversation"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onEscalationChange({
                          isEscalated: false,
                          escalationReason: null,
                        })
                      }
                      disabled={
                        !canManage ||
                        updatingEscalation ||
                        !conversation.isEscalated
                      }
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear Escalation
                    </button>
                    {conversation.isEscalated && (
                      <div className="text-xs text-neutral-500">
                        Escalated
                        {conversation.escalatedBy?.displayName
                          ? ` by ${conversation.escalatedBy.displayName}`
                          : ""}
                        {conversation.escalationTarget
                          ? ` to ${conversation.escalationTarget.replaceAll("_", " ")}`
                          : ""}
                        .
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <InternalNotes
                conversationId={conversation.id}
                disabled={!canManage}
              />
            </div>
          </>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 shadow-sm">
              Status: {conversation.status}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 shadow-sm">
              Priority: {conversation.priority}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 shadow-sm">
              Assignee: {conversation.assignee?.displayName ?? "Unassigned"}
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 shadow-sm">
              Tags: {conversation.tags?.length ?? 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
