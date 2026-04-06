"use client";

import {
  useRef,
  useState,
  useEffect,
  type UIEvent,
  type ChangeEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  assignConversation,
  generateConversationDraft,
  transitionConversation,
  updateConversation,
  logout,
  updateAvatar,
  uploadAvatarFile,
  uploadMessageFile,
  updateDisplayName,
  markChannelRead,
} from "@/lib/api";

import {
  ensureNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";

import type {
  ConversationPriority,
  ConversationLifecycleAction,
  ConversationStatus,
  Message,
  Me,
  SupportConversation,
} from "./types";

import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { TypingIndicator } from "./components/TypingIndicator";
import { SearchModal } from "./components/SearchModal";
import { ChatTitleBubble } from "./components/ChatTitleBubble";
import { SupportConversationHeader } from "./components/SupportConversationHeader";
import { SupportConversationMeta } from "./components/SupportConversationMeta";
import { SupportAssistantPanel } from "./components/SupportAssistantPanel";
import { ConversationControls } from "./components/ConversationControls";

import { useMessages } from "./hooks/useMessages";
import { useTyping } from "./hooks/useTyping";
import { usePresence } from "./hooks/usePresence";
import { useUnread } from "./hooks/useUnread";
import { useMobileSidebar } from "./hooks/useMobileSidebar";
import { useDmPeer } from "./hooks/useDmPeer";
import { useMentionCandidates } from "./hooks/useMentionCandidates";

// refactor hooks
import { useAuthGuard } from "./hooks/useAuthGuard";
import { useChannels } from "./hooks/useChannels";
import { useConversations } from "./hooks/useConversations";
import { useDisplayNameResolver } from "./hooks/useDisplayNameResolver";

import {
  extractMentionUserIds,
  formatDateTime,
  formatLastOnline,
} from "./utils/utils";

type ReplyTarget = {
  id: string;
  authorName: string;
  content: string | null;
};

const SUPPORT_STATUS_VALUES: ConversationStatus[] = [
  "OPEN",
  "PENDING",
  "RESOLVED",
  "CLOSED",
];

const SUPPORT_PRIORITY_VALUES: ConversationPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

function parseSupportStatus(value: string | null): ConversationStatus | "ALL" {
  if (value && SUPPORT_STATUS_VALUES.includes(value as ConversationStatus)) {
    return value as ConversationStatus;
  }

  return "ALL";
}

function parseSupportPriority(
  value: string | null,
): ConversationPriority | "ALL" {
  if (
    value &&
    SUPPORT_PRIORITY_VALUES.includes(value as ConversationPriority)
  ) {
    return value as ConversationPriority;
  }

  return "ALL";
}

function getLatestConversationActivityAt(conversation: SupportConversation) {
  return (
    conversation.lastMessageAt ??
    conversation.latestMessagePreview?.createdAt ??
    conversation.updatedAt ??
    conversation.createdAt
  );
}

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- auth ---
  const { user, setUser } = useAuthGuard();

  // --- channels (init + dms + active) ---
  const {
    channels,
    setChannels,
    active,
    setActive,
    activeChannel,
    regularChannels,
    dmChannels,
    newChannel,
    setNewChannel,
    creating,
    onCreateChannel,
    openDM,
  } = useChannels(user);

  const isAdmin = user?.role === "ADMIN";
  const supportConversationParam = searchParams.get("supportConversation");
  const {
    setFilters: setConversationFilters,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    setActiveConversation,
    loadingList: conversationsLoading,
    loadingActive: activeConversationLoading,
  } = useConversations(!!isAdmin, supportConversationParam);
  const supportStatusFilter = parseSupportStatus(
    searchParams.get("supportStatus"),
  );
  const supportPriorityFilter = parseSupportPriority(
    searchParams.get("supportPriority"),
  );
  const supportAssignedToMeOnly = searchParams.get("supportMine") === "1";
  const [activeView, setActiveView] = useState<"chat" | "support">(() => {
    const queryView = searchParams.get("view");
    if (queryView === "support" || supportConversationParam) {
      return "support";
    }

    return "chat";
  });

  function replaceQueryParams(
    updater: (params: URLSearchParams) => void,
  ) {
    const nextParams = new URLSearchParams(searchParams.toString());
    updater(nextParams);

    const currentQuery = searchParams.toString();
    const nextQuery = nextParams.toString();

    if (currentQuery === nextQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  // Persist active channel in localStorage
  function setActiveAndPersist(id: string) {
    setActive(id);
    if (user?.sub) {
      localStorage.setItem(`lastChannel:${user.sub}`, id);
    }
  }

  // --- local UI state ---
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [conversationActionError, setConversationActionError] = useState<
    string | null
  >(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [updatingTags, setUpdatingTags] = useState(false);
  const [updatingEscalation, setUpdatingEscalation] = useState(false);
  const [assistantInstructions, setAssistantInstructions] = useState("");
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantDraftAt, setAssistantDraftAt] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const sortedConversations = [...conversations].sort((a, b) => {
    const left = new Date(getLatestConversationActivityAt(a)).getTime();
    const right = new Date(getLatestConversationActivityAt(b)).getTime();
    return right - left;
  });

  useMobileSidebar(sidebarOpen, setSidebarOpen);

  // --- presence / typing / unread ---
  const { othersOnline, recently } = usePresence(user?.sub);
  const supportChannelId = activeConversation?.primaryChannelId ?? null;
  const messageChannelId = activeView === "support" ? supportChannelId : active;
  const selectedConversationId =
    activeView === "support" ? activeConversationId : null;
  const showSupportThread =
    activeView === "support" &&
    !!activeConversation &&
    !!supportChannelId &&
    !!messageChannelId;

  const { label: typingLabel, emitTyping } = useTyping(
    {
      channelId: messageChannelId,
      conversationId: selectedConversationId,
    },
    user?.sub,
  );

  useUnread({ active, myId: user?.sub, setChannels });

  // --- DM peer + mention candidates ---
  const dmPeer = useDmPeer({
    activeChannel,
    myId: user?.sub,
    othersOnline,
    recently,
  });

  const mentionCandidates = useMentionCandidates({
    activeChannel,
    user,
    othersOnline,
    recently,
  });

  // --- displayName resolver for deletes (no msgs dependency) ---
  const { resolveDisplayName } = useDisplayNameResolver({
    user,
    othersOnline,
    recently,
    channels,
  });

  // --- messages ---
  const {
    msgs,
    listRef,
    send,
    edit,
    remove,
    loadOlder,
    loadingOlder,
    hasMore,
    lastReadMessageIdByOthers,
    retrySend,
  } = useMessages(messageChannelId, user?.sub, {
    conversationId: selectedConversationId,
    lastReadSnapshot: activeChannel?.lastRead ?? null,
    resolveDisplayName,
    onIncomingMessage: (msg) => {
      if (!user) return;

      // skip own messages
      if (msg.authorId === user.sub) return;

      const isDifferentChannel = msg.channelId !== messageChannelId;
      const isMentioned = msg.mentions?.some((m) => m.userId === user.sub);

      if (isMentioned && isDifferentChannel) {
        showBrowserNotification({
          title: `${msg.author.displayName} mentioned you`,
          body: msg.content ?? "(no text)",
          icon: msg.author.avatarUrl ?? undefined,
        });
      }
    },
  });

  const restoredOnceRef = useRef(false);

  useEffect(() => {
    if (!user?.sub) return;
    if (restoredOnceRef.current) return;
    if (!channels.length) return;

    const saved = localStorage.getItem(`lastChannel:${user.sub}`);
    if (saved && channels.some((c) => c.id === saved)) {
      setActive(saved);
    }

    restoredOnceRef.current = true;
  }, [user?.sub, channels, setActive]);

  useEffect(() => {
    if (!isAdmin) return;

    setConversationFilters({
      status:
        supportStatusFilter === "ALL" ? undefined : supportStatusFilter,
      priority:
        supportPriorityFilter === "ALL" ? undefined : supportPriorityFilter,
      assigneeId: supportAssignedToMeOnly ? user?.sub : undefined,
    });
  }, [
    isAdmin,
    setConversationFilters,
    supportAssignedToMeOnly,
    supportPriorityFilter,
    supportStatusFilter,
    user?.sub,
  ]);

  useEffect(() => {
    if (!isAdmin) return;

    const queryView = searchParams.get("view");
    if (queryView === "support" || supportConversationParam) {
      setActiveView("support");
      return;
    }

    if (queryView === "chat") {
      setActiveView("chat");
    }
  }, [isAdmin, searchParams, supportConversationParam]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!conversations.length) return;
    if (!supportConversationParam) return;
    if (!conversations.some((item) => item.id === supportConversationParam)) {
      return;
    }
    if (
      activeConversationId &&
      conversations.some((item) => item.id === activeConversationId)
    ) {
      return;
    }

    setActiveConversationId(supportConversationParam);
  }, [
    activeConversationId,
    conversations,
    isAdmin,
    setActiveConversationId,
    supportConversationParam,
  ]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set("view", activeView);

    if (activeView === "support" && activeConversationId) {
      nextParams.set("supportConversation", activeConversationId);
    } else if (activeView !== "support") {
      nextParams.delete("supportConversation");
    }

    if (supportStatusFilter === "ALL") {
      nextParams.delete("supportStatus");
    } else {
      nextParams.set("supportStatus", supportStatusFilter);
    }

    if (supportPriorityFilter === "ALL") {
      nextParams.delete("supportPriority");
    } else {
      nextParams.set("supportPriority", supportPriorityFilter);
    }

    if (supportAssignedToMeOnly) {
      nextParams.set("supportMine", "1");
    } else {
      nextParams.delete("supportMine");
    }

    nextParams.set("supportSort", "latest_activity");

    const currentQuery = searchParams.toString();
    const nextQuery = nextParams.toString();

    if (currentQuery === nextQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [
    activeConversationId,
    activeView,
    pathname,
    router,
    searchParams,
    supportAssignedToMeOnly,
    supportPriorityFilter,
    supportStatusFilter,
  ]);

  useEffect(() => {
    if (!active) return;
    if (!user?.sub) return;
    if (activeView !== "chat") return;

    markChannelRead(active)
      .then((res) => {
        // res.lastRead from backend
        setChannels((prev) =>
          prev.map((c) =>
            c.id === active
              ? { ...c, unread: 0, lastRead: res?.lastRead ?? c.lastRead }
              : c,
          ),
        );
      })
      .catch(() => {});
  }, [active, activeView, user?.sub, setChannels]);

  useEffect(() => {
    setReplyTo(null);
    setSearchOpen(false);
    setConversationActionError(null);
    setAssistantDraft("");
    setAssistantDraftAt(null);
    setAssistantError(null);
  }, [activeView, activeConversationId, active]);

  function syncConversationState(
    nextConversation: Exclude<typeof activeConversation, null>,
  ) {
    setActiveConversation(nextConversation);
    setConversations((prev) =>
      prev.map((item) =>
        item.id === nextConversation.id ? { ...item, ...nextConversation } : item,
      ),
    );
  }

  async function handleTransitionConversation(
    action: ConversationLifecycleAction,
  ) {
    if (!activeConversationId) return;

    try {
      setConversationActionError(null);
      setUpdatingStatus(true);
      const updated = await transitionConversation(activeConversationId, action);
      syncConversationState(updated);
    } catch (e: any) {
      setConversationActionError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to update conversation status",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAssignConversation(assigneeId?: string | null) {
    if (!activeConversationId) return;

    try {
      setConversationActionError(null);
      setUpdatingAssignment(true);
      const updated = await assignConversation(activeConversationId, assigneeId);
      syncConversationState(updated);
    } catch (e: any) {
      setConversationActionError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to update conversation assignee",
      );
    } finally {
      setUpdatingAssignment(false);
    }
  }

  async function handleGenerateDraft() {
    if (!activeConversationId) return;

    try {
      setAssistantError(null);
      setAssistantLoading(true);
      const result = await generateConversationDraft(
        activeConversationId,
        assistantInstructions,
      );
      setAssistantDraft(result.draft ?? "");
      setAssistantDraftAt(result.generatedAt ?? null);
    } catch (e: any) {
      setAssistantError(
        e?.response?.data?.message ?? e?.message ?? "Failed to generate draft",
      );
    } finally {
      setAssistantLoading(false);
    }
  }

  async function handleUpdateConversationPriority(
    priority: Exclude<(typeof activeConversation), null>["priority"],
  ) {
    if (!activeConversationId) return;

    try {
      setConversationActionError(null);
      setUpdatingPriority(true);
      const updated = await updateConversation(activeConversationId, { priority });
      syncConversationState(updated);
    } catch (e: any) {
      setConversationActionError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to update conversation priority",
      );
    } finally {
      setUpdatingPriority(false);
    }
  }

  async function handleUpdateConversationTags(tags: string[]) {
    if (!activeConversationId) return;

    try {
      setConversationActionError(null);
      setUpdatingTags(true);
      const updated = await updateConversation(activeConversationId, { tags });
      syncConversationState(updated);
    } catch (e: any) {
      setConversationActionError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to update conversation tags",
      );
    } finally {
      setUpdatingTags(false);
    }
  }

  async function handleUpdateConversationEscalation(next: {
    isEscalated: boolean;
    escalationReason?: string | null;
  }) {
    if (!activeConversationId) return;

    try {
      setConversationActionError(null);
      setUpdatingEscalation(true);
      const updated = await updateConversation(activeConversationId, {
        isEscalated: next.isEscalated,
        escalationReason: next.escalationReason ?? null,
      });
      syncConversationState(updated);
    } catch (e: any) {
      setConversationActionError(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to update conversation escalation",
      );
    } finally {
      setUpdatingEscalation(false);
    }
  }

  function handleUseDraft() {
    if (!assistantDraft) return;
    setText(assistantDraft);
  }

  // ---- handlers ----
  async function handleSend(files: File[] = []) {
    if (!messageChannelId) return;

    const trimmed = text.trim();
    const hasText = trimmed.length > 0;
    const hasFiles = files.length > 0;

    // Nothing to send → stop
    if (!hasText && !hasFiles) return;

    try {
      const mentions = extractMentionUserIds(text, mentionCandidates);

      // 1) Upload all files
      let attachments: Array<{
        url: string;
        fileName: string;
        mimeType: string;
        size: number;
      }> = [];

      if (files.length > 0) {
        const uploaded = await Promise.all(
          files.map((f) => uploadMessageFile(f)),
        );
        attachments = uploaded.map((a) => ({
          url: a.url,
          fileName: a.fileName,
          mimeType: a.mimeType,
          size: a.size,
        }));
      }

      // 2) Send via hook
      await send(
        trimmed || undefined,
        replyTo?.id ?? undefined,
        mentions,
        attachments,
      );

      setText("");
      setReplyTo(null);

      requestAnimationFrame(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  }

  function startEdit(m: Message) {
    if (m.deletedAt) return;
    setEditingId(m.id);
    setEditText(m.content ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(messageId: string) {
    const t = editText.trim();
    if (!t) return;
    try {
      await edit(messageId, t);
      setEditingId(null);
      setEditText("");
    } catch (e) {
      console.error("Failed to save edit:", e);
    }
  }

  async function removeMessage(messageId: string) {
    if (!user) return;
    try {
      await remove(messageId, { id: user.sub, displayName: user.displayName });
    } catch (e) {
      console.error("Failed to delete message:", e);
    }
  }

  function handleReply(message: Message) {
    setReplyTo({
      id: message.id,
      authorName: message.author.displayName,
      content: message.content ?? null,
    });
  }

  function handleTypingInput(v: string) {
    setText(v);
    if (!user) return;
    emitTyping({
      channelId: messageChannelId,
      conversationId: selectedConversationId,
    });
  }

  function handleLogout() {
    logout();
    setUser(null);
    router.push("/login");
  }

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop <= 32 && !loadingOlder && hasMore) {
      loadOlder();
    }
  }

  async function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const updated = await uploadAvatarFile(file);
      setUser((prev) => (prev ? { ...prev, ...updated } : (updated as Me)));
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveAvatar() {
    try {
      const updated = await updateAvatar();
      setUser((prev) => (prev ? { ...prev, ...updated } : (updated as Me)));
    } catch (err) {
      console.error("Failed to remove avatar:", err);
    }
  }

  async function handleChangeUsername(nextDisplayName: string) {
    const dn = (nextDisplayName ?? "").trim();
    if (!dn) return;

    try {
      const updated = await updateDisplayName(dn);
      setUser((prev) => (prev ? { ...prev, ...updated } : (updated as Me)));
    } catch (e: any) {
      alert(
        e?.response?.data?.message || e?.message || "Failed to change username",
      );
    }
  }

  if (!user) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <a href="/login" className="underline">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col">
      <ChatHeader
        user={user}
        activeChannel={activeView === "chat" ? activeChannel : undefined}
        fileInputRef={fileInputRef}
        avatarUploading={avatarUploading}
        onAvatarChange={handleAvatarFileChange}
        onRemoveAvatar={handleRemoveAvatar}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        dmPeer={dmPeer}
        onEnableNotifications={() => ensureNotificationPermission()}
        onOpenSearch={() => setSearchOpen(true)}
        onChangeUsername={handleChangeUsername}
        centerTitle={
          activeView === "support"
            ? (activeConversation?.subject ?? "Support inbox")
            : undefined
        }
        searchDisabled={activeView === "support"}
      />

      <div className="flex-1 min-h-0 flex relative md:bg-stone-100">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`
            absolute inset-y-0 left-0 z-50 w-64 bg-stone-100
            transform transition-transform duration-200 ease-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:translate-x-0 md:w-72 md:bg-stone-100 md:h-full md:block
            border-r border-stone-200 md:border-r-0
          `}
        >
          <Sidebar
            regularChannels={regularChannels}
            dmChannels={dmChannels}
            active={active}
            setActive={(id) => {
              setActiveView("chat");
              setActiveAndPersist(id);
              setSidebarOpen(false);
            }}
            newChannel={newChannel}
            setNewChannel={setNewChannel}
            creating={creating}
            onCreateChannel={onCreateChannel}
            othersOnline={othersOnline}
            recently={recently}
            openDM={openDM}
            formatLastOnline={formatLastOnline}
            meId={user.sub}
            isAdmin={user.role === "ADMIN"}
            conversations={sortedConversations}
            activeConversationId={
              activeView === "support" ? activeConversationId : null
            }
            onSelectConversation={(conversationId) => {
              setActiveView("support");
              setActiveConversationId(conversationId);
              setSidebarOpen(false);
            }}
            supportStatusFilter={supportStatusFilter}
            supportPriorityFilter={supportPriorityFilter}
            supportAssignedToMeOnly={supportAssignedToMeOnly}
            onSupportStatusFilterChange={(value) => {
              replaceQueryParams((params) => {
                if (value === "ALL") {
                  params.delete("supportStatus");
                } else {
                  params.set("supportStatus", value);
                }
                params.delete("supportConversation");
              });
            }}
            onSupportPriorityFilterChange={(value) => {
              replaceQueryParams((params) => {
                if (value === "ALL") {
                  params.delete("supportPriority");
                } else {
                  params.set("supportPriority", value);
                }
                params.delete("supportConversation");
              });
            }}
            onSupportAssignedToMeOnlyChange={(value) => {
              replaceQueryParams((params) => {
                if (value) {
                  params.set("supportMine", "1");
                } else {
                  params.delete("supportMine");
                }
                params.delete("supportConversation");
              });
            }}
            conversationsLoading={conversationsLoading}
          />
        </div>

        <main
          className="
            flex-1 flex flex-col min-h-0 min-w-0
            relative
            bg-[url('/BackgroundMessages.png')]
            bg-repeat
            bg-[length:350px_350px]

            md:rounded-tl-2xl
            md:border md:border-neutral-300
            md:overflow-hidden
            md:relative md:z-10

            md:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]
          "
        >
          <div className="flex-1 min-h-0 relative z-20">
            {activeView === "chat" && (activeChannel?.isDirect ?? false) ? (
              <div className="absolute top-0 left-0 right-0 z-40">
                <ChatTitleBubble
                  activeChannel={activeChannel}
                  dmPeer={dmPeer}
                />
              </div>
              ) : activeView === "chat" ? (
                <div className="md:hidden absolute top-0 left-0 right-0 z-40">
                  <ChatTitleBubble
                    activeChannel={activeChannel}
                    dmPeer={dmPeer}
                  />
                </div>
              ) : null}

            <div
              className={`h-full flex flex-col ${
                activeView === "support"
                  ? "bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.9),_rgba(245,245,244,0.92)_42%,_rgba(255,255,255,0.88)_100%)]"
                  : ""
              }`}
            >
              {activeView === "support" && activeConversation && (
                <SupportConversationHeader conversation={activeConversation} />
              )}

              {activeView === "support" && activeConversation && (
                <SupportConversationMeta conversation={activeConversation} />
              )}

              {activeView === "support" && activeConversation && (
                <ConversationControls
                  conversation={activeConversation}
                  me={{ id: user.sub, displayName: user.displayName }}
                  canManage={user.role === "ADMIN"}
                  updatingStatus={updatingStatus}
                  updatingAssignment={updatingAssignment}
                  updatingPriority={updatingPriority}
                  updatingTags={updatingTags}
                  updatingEscalation={updatingEscalation}
                  onTransition={handleTransitionConversation}
                  onAssign={handleAssignConversation}
                  onPriorityChange={handleUpdateConversationPriority}
                  onTagsChange={handleUpdateConversationTags}
                  onEscalationChange={handleUpdateConversationEscalation}
                />
              )}

              {activeView === "support" && activeConversation && (
                <SupportAssistantPanel
                  draft={assistantDraft}
                  generatedAt={assistantDraftAt}
                  instructions={assistantInstructions}
                  loading={assistantLoading}
                  error={assistantError}
                  onInstructionsChange={setAssistantInstructions}
                  onGenerate={handleGenerateDraft}
                  onUseDraft={handleUseDraft}
                  onClearDraft={() => {
                    setAssistantDraft("");
                    setAssistantDraftAt(null);
                    setAssistantError(null);
                  }}
                />
              )}

              {activeView === "support" && conversationActionError && (
                <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {conversationActionError}
                </div>
              )}

              {activeView === "support" && !activeConversationLoading && (
                !activeConversation ? (
                  <div className="flex-1 grid place-items-center px-6 text-center text-sm text-neutral-500">
                    Select a support conversation from the inbox to view it.
                  </div>
                ) : !supportChannelId ? (
                  <div className="flex-1 grid place-items-center px-6 text-center text-sm text-neutral-500">
                    This conversation does not have a linked message channel yet.
                  </div>
                ) : null
              )}

              {activeConversationLoading && activeView === "support" && (
                <div className="flex-1 grid place-items-center px-6 text-sm text-neutral-500">
                  Loading conversation...
                </div>
              )}

              {(activeView === "chat" || showSupportThread) && messageChannelId && (
                <MessageList
                  msgs={msgs}
                  meId={user.sub}
                  channelId={messageChannelId}
                  listRef={listRef}
                  editingId={editingId}
                  editText={editText}
                  setEditText={setEditText}
                  onStartEdit={(m) => startEdit(m)}
                  onSaveEdit={(m) => saveEdit(m.id)}
                  onCancelEdit={cancelEdit}
                  onDelete={(m) => removeMessage(m.id)}
                  onReply={(m) => handleReply(m)}
                  formatDateTime={formatDateTime}
                  onScroll={handleScroll}
                  isDirect={
                    activeView === "chat" ? (activeChannel?.isDirect ?? false) : false
                  }
                  lastReadMessageIdByOthers={lastReadMessageIdByOthers}
                  scrollToMessageId={scrollToMessageId}
                  onScrolledToMessage={() => setScrollToMessageId(null)}
                  loadingOlder={loadingOlder}
                  onRetrySend={retrySend}
                />
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30">
            <TypingIndicator label={typingLabel} />
            {(activeView === "chat" || showSupportThread) && messageChannelId && (
              <Composer
                value={text}
                onChange={handleTypingInput}
                onSend={handleSend}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                mentionCandidates={mentionCandidates}
              />
            )}
          </div>
        </main>
      </div>

      <SearchModal
        open={searchOpen && activeView === "chat"}
        channelId={activeView === "chat" ? active : null}
        activeChannel={activeChannel}
        dmPeerName={dmPeer?.displayName ?? null}
        onClose={() => setSearchOpen(false)}
        onJumpToMessage={(messageId) => {
          setSearchOpen(false);
          setScrollToMessageId(messageId);
        }}
      />
    </div>
  );
}
