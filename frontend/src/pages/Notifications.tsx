import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Notification } from "../types";

const severityStyles: Record<string, string> = {
  critical: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-sky-300 bg-sky-50 text-sky-950",
};

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.notifications();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, []);

  async function markOne(id: string) {
    await api.markNotificationRead(id);
    await load();
  }

  async function markAll() {
    setBusy(true);
    try {
      await api.markAllNotificationsRead();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Notifications</h1>
          <p className="mt-1 text-muted">
            {unread} unread · policy updates, circulars, and review alerts
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn-ghost text-sm"
          disabled={busy || unread === 0}
          onClick={() => void markAll()}
        >
          Mark all read
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border px-4 py-4 ${severityStyles[n.severity] ?? severityStyles.info} ${
              n.read ? "opacity-70" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">
                  {n.severity} · {n.event_type.replaceAll("_", " ")}
                </p>
                <p className="mt-1 font-semibold">{n.title}</p>
                <p className="mt-1 text-sm opacity-90">{n.body}</p>
                <p className="mt-2 text-xs opacity-60">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost shrink-0 bg-white/70 text-xs"
                  onClick={() => void markOne(n.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="ui-card px-4 py-8 text-center text-sm text-muted">
            No notifications yet.
          </li>
        )}
      </ul>
    </div>
  );
}
