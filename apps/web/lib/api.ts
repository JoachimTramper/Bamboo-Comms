// apps/web/lib/api.ts
import axios from "axios";
import { refreshSocketAuth } from "@/lib/socket";
import type { Message } from "@/app/chat/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
  withCredentials: true,
});

const TOKEN_KEY = "accessToken";
let CURRENT_TOKEN: string | null = null; // per-tab in-memory cache

// ---- Token helpers ----
export function setToken(token: string | null) {
  CURRENT_TOKEN = token;

  if (typeof window !== "undefined") {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";

  // keep socket auth in sync
  refreshSocketAuth(token);
}

export function getToken() {
  if (CURRENT_TOKEN) return CURRENT_TOKEN;

  if (typeof window !== "undefined") {
    CURRENT_TOKEN = sessionStorage.getItem(TOKEN_KEY);
    return CURRENT_TOKEN;
  }

  return null;
}

// init on load (hydrate default header)
if (typeof window !== "undefined") {
  const t = getToken();
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
}

// ---- Interceptors ----
// Always attach latest token (belt)
api.interceptors.request.use((config) => {
  const token = CURRENT_TOKEN ?? getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Silent refresh (401 -> refresh -> retry) ----
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // backend uses HttpOnly refresh cookie
  const { data } = await api.post("/auth/refresh");
  const next = (data?.accessToken as string | undefined) ?? null;
  setToken(next);
  return next;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;

    // No config or not 401 => normal error
    if (!original || status !== 401) return Promise.reject(err);

    // Do not retry refresh call itself
    const url: string = original.url || "";
    const isRefreshCall = url.includes("/auth/refresh");
    if (isRefreshCall) {
      setToken(null);
      return Promise.reject(err);
    }

    // Prevent infinite retry loops
    if ((original as any)._retry) {
      setToken(null);
      return Promise.reject(err);
    }
    (original as any)._retry = true;

    try {
      // single-flight refresh: multiple 401s at the same time => 1 refresh request
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            return await refreshAccessToken();
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;

      if (!newToken) {
        setToken(null);
        return Promise.reject(err);
      }

      // Retry original reuest with new token
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api.request(original);
    } catch (e) {
      setToken(null);
      return Promise.reject(e);
    }
  }
);

// ---- Auth ----
export async function register(
  email: string,
  password: string,
  displayName: string,
  inviteCode?: string
) {
  const { data } = await api.post("/auth/register", {
    email,
    password,
    displayName,
    inviteCode: inviteCode?.trim() || undefined,
  });

  if (data?.accessToken) setToken(data.accessToken);

  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });

  if (data?.accessToken) setToken(data.accessToken);

  return data;
}

export type MeResponse = {
  sub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  role: "USER" | "ADMIN";
  bot?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export async function me() {
  const { data } = await api.get("/auth/me");
  return data as MeResponse;
}

export async function updateAvatar() {
  const { data } = await api.patch("/auth/me/avatar");
  return data as MeResponse;
}

export async function uploadAvatarFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post("/auth/me/avatar/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as MeResponse;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {}
  setToken(null);
}

// ---- Channels & Messages ----
export async function listChannels() {
  const { data } = await api.get("/channels");
  return data as Array<{ id: string; name: string }>;
}

export async function createChannel(name: string) {
  const { data } = await api.post("/channels", { name });
  return data as { id: string; name: string };
}

export async function listMessages(
  channelId: string,
  opts?: { take?: number; cursor?: string }
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (opts?.take) params.set("take", String(opts.take));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const qs = params.toString();
  const { data } = await api.get(
    `/channels/${channelId}/messages${qs ? `?${qs}` : ""}`
  );
  return data as Message[];
}

// Search messages in a channel
export async function searchMessages(
  channelId: string,
  opts: { query: string; take?: number; cursor?: string }
): Promise<Message[]> {
  const params = new URLSearchParams();
  params.set("query", opts.query);
  if (opts.take) params.set("take", String(opts.take));
  if (opts.cursor) params.set("cursor", opts.cursor);

  const qs = params.toString();
  const { data } = await api.get(
    `/channels/${channelId}/messages/search${qs ? `?${qs}` : ""}`
  );

  return data as Message[];
}

export async function sendMessage(
  channelId: string,
  content?: string,
  replyToMessageId?: string,
  mentionUserIds: string[] = [],
  attachments: Array<any> = [],
  lastReadOverride?: string | null
) {
  const { data } = await api.post(`/channels/${channelId}/messages`, {
    content,
    replyToMessageId,
    mentionUserIds,
    attachments,
    lastReadOverride,
  });
  return data as Message;
}

export async function updateMessage(
  channelId: string,
  messageId: string,
  content: string
) {
  const { data } = await api.patch(
    `/channels/${channelId}/messages/${messageId}`,
    { content }
  );
  return data as {
    id: string;
    channelId: string;
    content: string;
    updatedAt: string;
    authorId: string;
    author: { id: string; displayName: string };
  };
}

export async function deleteMessage(channelId: string, messageId: string) {
  await api.delete(`/channels/${channelId}/messages/${messageId}`);
}

// reactions
export async function reactToMessage(
  channelId: string,
  messageId: string,
  emoji: string
) {
  const { data } = await api.post(
    `/channels/${channelId}/messages/${messageId}/reactions`,
    { emoji }
  );
  return data as { ok: true };
}

export async function unreactToMessage(
  channelId: string,
  messageId: string,
  emoji: string
) {
  const { data } = await api.delete(
    `/channels/${channelId}/messages/${messageId}/reactions`,
    { data: { emoji } }
  );
  return data as { ok: true } | undefined;
}

// attachments
export async function uploadMessageFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post("/uploads/message", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as {
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
}

// ---- Direct Messages ----
export async function listDirectChannels() {
  const { data } = await api.get("/channels/direct");
  return data as Array<{
    id: string;
    name: string;
    isDirect: boolean;
    members: { id: string; displayName: string; avatarUrl: string | null }[];
  }>;
}

export async function getOrCreateDirectChannel(userId: string) {
  const { data } = await api.get(`/channels/direct/${userId}`);
  return data as {
    id: string;
    name: string;
    members: { id: string; displayName: string; avatarUrl: string | null }[];
  };
}

// Mark channel as read
export async function markChannelRead(channelId: string) {
  const { data } = await api.post(`/channels/${channelId}/read`);
  return data;
}

// Channels with unread counts
export async function listChannelsWithUnread() {
  const { data } = await api.get(`/channels/with-unread`);
  return data as Array<{
    id: string;
    name: string;
    isDirect: boolean;
    unread: number;
    lastRead: string | null;
  }>;
}
