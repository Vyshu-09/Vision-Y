import type {
  ChatResponse,
  Circular,
  ClarificationTicket,
  Notification,
  PolicyRow,
  PublicUser,
  QueryRecord,
  ReviewQueue,
  Role,
} from "../types";

const TOKEN_KEY = "unipolicy_token";
const REMEMBER_KEY = "unipolicy_remember";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null, remember = true): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  if (remember) localStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export function getRememberPreference(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== "0";
}

export function setRememberPreference(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string, role: Role) =>
    request<{ token: string; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    }),

  me: () => request<{ user: PublicUser }>("/api/auth/me"),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.set("avatar", file);
    return request<{ user: PublicUser }>("/api/auth/avatar", { method: "POST", body: form });
  },

  removeAvatar: () =>
    request<{ user: PublicUser }>("/api/auth/avatar", { method: "DELETE" }),

  chat: (question: string) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  chatHistory: () => request<{ queries: QueryRecord[] }>("/api/chat/history"),

  policies: (q = "") =>
    request<{ policies: PolicyRow[] }>(`/api/policies?q=${encodeURIComponent(q)}`),

  policy: (id: string) =>
    request<{ policy: PolicyRow; clauses: unknown[] }>(`/api/policies/${id}`),

  circulars: () => request<{ circulars: Circular[] }>("/api/circulars"),

  notifications: () =>
    request<{ notifications: Notification[]; unread: number }>("/api/notifications"),

  markNotificationRead: (id: string) =>
    request<{ notification: Notification }>(`/api/notifications/${id}/read`, {
      method: "POST",
      body: "{}",
    }),

  markAllNotificationsRead: () =>
    request<{ notifications: Notification[]; unread: number }>("/api/notifications/read-all", {
      method: "POST",
      body: "{}",
    }),

  createClarification: (payload: {
    question_text: string;
    answer_text: string;
    reason: string;
    policy_id?: string | null;
  }) =>
    request<{ clarification: ClarificationTicket }>("/api/clarifications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  clarifications: () =>
    request<{ clarifications: ClarificationTicket[] }>("/api/clarifications"),

  resolveClarification: (id: string, resolution_notes: string) =>
    request<{ clarification: ClarificationTicket }>(`/api/clarifications/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes }),
    }),

  flag: (payload: { policy_id?: string; query_id?: string; reason: string }) =>
    request<{ flag: { id: string } }>("/api/flags", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  reviewQueue: () => request<ReviewQueue>("/api/admin/review-queue"),

  adminStats: () => request<{ stats: ReviewQueue["stats"] }>("/api/admin/stats"),

  uploadPolicy: (form: FormData) =>
    request<{
      policy: PolicyRow;
      clause_count: number;
      supersession_id: string | null;
      new_conflicts: number;
    }>("/api/admin/upload", { method: "POST", body: form }),

  activatePolicy: (id: string, notify_roles?: string[]) =>
    request<{ policy: PolicyRow; notified_roles?: string[] }>(`/api/admin/policies/${id}/activate`, {
      method: "POST",
      body: JSON.stringify({ notify_roles }),
    }),

  rejectPolicy: (id: string) =>
    request<{ policy: PolicyRow }>(`/api/admin/policies/${id}/reject`, {
      method: "POST",
      body: "{}",
    }),

  approveSupersession: (id: string, notify_roles?: string[]) =>
    request<{ supersession: unknown; notified_roles?: string[] }>(`/api/admin/supersessions/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notify_roles }),
    }),

  rejectSupersession: (id: string) =>
    request(`/api/admin/supersessions/${id}/reject`, { method: "POST", body: "{}" }),

  resolveConflict: (id: string, notes: string) =>
    request(`/api/admin/conflicts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes: notes }),
    }),

  rejectConflict: (id: string) =>
    request(`/api/admin/conflicts/${id}/reject`, { method: "POST", body: "{}" }),

  resolveFlag: (id: string, notes: string) =>
    request(`/api/admin/flags/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes: notes }),
    }),

  rejectFlag: (id: string) =>
    request(`/api/admin/flags/${id}/reject`, { method: "POST", body: "{}" }),
};
