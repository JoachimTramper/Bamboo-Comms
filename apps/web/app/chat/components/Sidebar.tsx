"use client";

import type {
  ChannelWithUnread,
  ConversationPriority,
  ConversationStatus,
  OnlineUser,
  SupportConversation,
} from "../types";
import { MessageCircle } from "lucide-react";
import { Avatar } from "./Avatar";
import { SupportInboxList } from "./SupportInboxList";

type Props = {
  regularChannels: ChannelWithUnread[];
  dmChannels: ChannelWithUnread[];
  active: string | null;
  setActive: (id: string) => void;
  newChannel: string;
  setNewChannel: (v: string) => void;
  creating: boolean;
  onCreateChannel: () => Promise<void> | void;
  othersOnline: OnlineUser[];
  recently: OnlineUser[];
  openDM: (id: string) => Promise<void> | void;
  formatLastOnline: (d?: string | null) => string;
  meId: string;
  isAdmin: boolean;
  creatingSupportConversation?: boolean;
  onCreateSupportConversation?: () => Promise<void> | void;
  supportCreateError?: string | null;
  conversations?: SupportConversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  supportStatusFilter?: ConversationStatus | "ALL";
  supportPriorityFilter?: ConversationPriority | "ALL";
  supportAssignedToMeOnly?: boolean;
  onSupportStatusFilterChange?: (value: ConversationStatus | "ALL") => void;
  onSupportPriorityFilterChange?: (value: ConversationPriority | "ALL") => void;
  onSupportAssignedToMeOnlyChange?: (value: boolean) => void;
  conversationsLoading?: boolean;
  conversationsError?: string | null;
};

type PresenceStatus = "online" | "idle" | "offline";

export function Sidebar({
  regularChannels,
  dmChannels,
  active,
  setActive,
  newChannel,
  setNewChannel,
  creating,
  onCreateChannel,
  othersOnline,
  recently,
  openDM,
  formatLastOnline,
  meId,
  isAdmin,
  creatingSupportConversation = false,
  onCreateSupportConversation,
  supportCreateError = null,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  supportStatusFilter = "ALL",
  supportPriorityFilter = "ALL",
  supportAssignedToMeOnly = false,
  onSupportStatusFilterChange,
  onSupportPriorityFilterChange,
  onSupportAssignedToMeOnlyChange,
  conversationsLoading = false,
  conversationsError = null,
}: Props) {
  // --- Presence helpers ---
  function getUserStatus(userId: string): PresenceStatus {
    const onlineUser = othersOnline.find((u) => u.id === userId);
    if (onlineUser) {
      return onlineUser.status === "idle" ? "idle" : "online";
    }

    if (recently.some((u) => u.id === userId)) {
      return "offline";
    }

    return "offline";
  }

  function getStatusDotClass(status: PresenceStatus): string {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-400";
      case "offline":
      default:
        return "bg-neutral-300";
    }
  }

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3">
      {!isAdmin && onCreateSupportConversation && (
        <section className="shrink-0 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3 shadow-sm md:hidden">
          <div className="text-sm font-semibold text-neutral-900">
            Need support?
          </div>
          <div className="mt-1 text-xs leading-5 text-neutral-600">
            Create a support conversation so the admin inbox can pick it up.
          </div>
          <button
            type="button"
            onClick={onCreateSupportConversation}
            disabled={creatingSupportConversation}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingSupportConversation
              ? "Creating..."
              : "Start Support Conversation"}
          </button>
          {supportCreateError && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {supportCreateError}
            </div>
          )}
        </section>
      )}

      <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {onSelectConversation && (isAdmin || conversations.length > 0) && (
          <div className="min-h-0 min-w-0 max-h-[55%] shrink-0 overflow-hidden">
            <SupportInboxList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={onSelectConversation}
              statusFilter={supportStatusFilter}
              priorityFilter={supportPriorityFilter}
              assignedToMeOnly={supportAssignedToMeOnly}
              onStatusFilterChange={onSupportStatusFilterChange ?? (() => {})}
              onPriorityFilterChange={
                onSupportPriorityFilterChange ?? (() => {})
              }
              onAssignedToMeOnlyChange={
                onSupportAssignedToMeOnlyChange ?? (() => {})
              }
              title={isAdmin ? "Support Inbox" : "My Support"}
              showFilters={isAdmin}
              emptyStateMessage={
                isAdmin
                  ? "No support conversations yet. New customer threads will appear here."
                  : "You have not started any support conversations yet."
              }
              loading={conversationsLoading}
              error={conversationsError}
            />
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto">
          {/* Channels */}
          <section className="min-w-0">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-neutral-800">
              Channels
            </h2>
            {isAdmin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onCreateChannel();
                }}
                className="mt-2 flex min-w-0 gap-2"
              >
                <input
                  className="
                  min-w-0 flex-1 px-2 py-1 text-sm rounded-lg border border-neutral-300 bg-white
                  text-neutral-900 placeholder:text-neutral-500
                  disabled:bg-neutral-100 disabled:text-neutral-400
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none
                "
                  placeholder="New channel…"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  disabled={creating}
                />
                <button
                  className="
                  px-3 py-1.5 text-sm rounded-lg
                  bg-indigo-600 text-white font-medium
                  shadow-lg hover:shadow-xl
                  border border-transparent
                  transition-colors transition-shadow
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                  disabled:opacity-70 disabled:cursor-not-allowed
                "
                  disabled={creating || !newChannel.trim()}
                  type="submit"
                >
                  Add
                </button>
              </form>
            )}

            <div className="mt-2 space-y-1">
              {regularChannels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`flex min-w-0 items-center justify-between w-full text-left px-2 py-1 rounded-lg text-sm border
                            transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md
                  ${
                    active === c.id
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                      : "hover:bg-neutral-100 border-transparent text-neutral-800"
                  }`}
                >
                  <span className="min-w-0 truncate">#{c.name}</span>
                  {(c.unread ?? 0) > 0 && (
                    <span className="ml-2 shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-semibold min-w-[1rem] h-4 px-[5px] leading-none shadow-sm">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
              {regularChannels.length === 0 && (
                <div className="text-sm text-neutral-500 mt-1 px-2">
                  No channels yet
                </div>
              )}
            </div>
          </section>

          {/* Direct Messages */}
          <section className="min-w-0">
            <h3
              className="
            font-semibold text-xs uppercase tracking-wide text-neutral-800
            "
            >
              Direct Messages
            </h3>
            <div className="mt-2 space-y-1">
              {dmChannels.length === 0 ? (
                <div className="text-sm text-neutral-500 px-2">No DMs yet</div>
              ) : (
                dmChannels.map((c) => {
                  // Other person in the DM channel (not myself)
                  const other =
                    c.members && c.members.length > 0
                      ? (c.members.find((m) => m.id !== meId) ?? c.members[0])
                      : undefined;

                  // 1) Presence first by id
                  let presenceUser =
                    (other && othersOnline.find((u) => u.id === other.id)) ||
                    (other && recently.find((u) => u.id === other.id)) ||
                    null;

                  // 2) If not, try by channel name (c.name)
                  if (!presenceUser) {
                    presenceUser =
                      othersOnline.find((u) => u.displayName === c.name) ||
                      recently.find((u) => u.displayName === c.name) ||
                      null;
                  }

                  // 3) Determine status
                  let status: PresenceStatus;
                  if (presenceUser?.status === "idle") {
                    status = "idle";
                  } else if (presenceUser?.status === "online") {
                    status = "online";
                  } else if (other) {
                    status = getUserStatus(other.id);
                  } else {
                    status = "offline";
                  }

                  const dotClass = getStatusDotClass(status);

                  // 4) Name + avatar-url
                  const displayName =
                    presenceUser?.displayName ?? other?.displayName ?? c.name;

                  const avatarUrl =
                    presenceUser?.avatarUrl ?? other?.avatarUrl ?? null;

                  const hasKnownUser = !!(presenceUser || other);

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActive(c.id)}
                      className={`flex items-center justify-between w-full text-left px-2 py-1 rounded-lg text-sm border
                                transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md
                      ${
                        active === c.id
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                          : "hover:bg-neutral-100 border-transparent text-neutral-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {hasKnownUser ? (
                          <div className="relative">
                            <Avatar
                              name={displayName}
                              avatarUrl={avatarUrl}
                              size={22}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${dotClass}`}
                            />
                          </div>
                        ) : (
                          <span className="text-lg">💬</span>
                        )}

                        <span className="min-w-0 flex-1 truncate">
                          {c.name}
                        </span>
                      </div>

                      {(c.unread ?? 0) > 0 && (
                        <span className="ml-2 shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-semibold min-w-[1rem] h-4 px-[5px] leading-none shadow-sm">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Online */}
          <div className="min-w-0">
            <h3 className="font-semibold text-xs uppercase tracking-wide text-neutral-800">
              Online ({othersOnline.length})
            </h3>
            <div className="mt-1 space-y-0.5">
              {othersOnline.length === 0 ? (
                <div className="text-sm text-neutral-500 px-2">
                  No one else online
                </div>
              ) : (
                othersOnline.map((u) => (
                  <div
                    key={u.id}
                    className="flex min-w-0 items-center gap-2 text-sm px-2 py-1 text-neutral-800"
                  >
                    <Avatar
                      name={u.displayName}
                      avatarUrl={u.avatarUrl ?? null}
                      size={22}
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        {u.displayName}
                      </span>
                      <button
                        className="shrink-0 rounded-md p-1 hover:bg-neutral-100 hover:text-indigo-500"
                        onClick={() => openDM(u.id)}
                        title={`Message ${u.displayName}`}
                        aria-label={`Message ${u.displayName}`}
                      >
                        <MessageCircle size={16} className="text-black" />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Offline */}
          <div className="min-w-0">
            <h3 className="font-semibold text-xs uppercase tracking-wide text-neutral-800">
              Offline ({recently.length})
            </h3>
            <div className="mt-1 space-y-0.5">
              {recently.length === 0 ? (
                <div className="text-sm text-neutral-500 px-2">
                  No offline users
                </div>
              ) : (
                recently.map((u) => (
                  <div
                    key={u.id}
                    className="min-w-0 text-sm border-b border-neutral-200 px-2 py-1 pb-1 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          name={u.displayName}
                          avatarUrl={u.avatarUrl ?? null}
                          size={22}
                        />
                        <span className="min-w-0 truncate font-medium text-neutral-500">
                          {u.displayName}
                        </span>
                      </div>
                      <button
                        className="shrink-0 p-1 hover:text-indigo-500"
                        title={`Message ${u.displayName}`}
                        onClick={() => openDM(u.id)}
                      >
                        <MessageCircle size={16} className="text-black" />
                      </button>
                    </div>
                    <div className="ml-8 text-xs text-neutral-500">
                      {formatLastOnline(u.lastSeen)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
