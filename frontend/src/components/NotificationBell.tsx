import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Notification } from "../types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await api.notifications();
      setItems(data.notifications.slice(0, 6));
      setUnread(data.unread);
    } catch {
      /* ignore polling errors */
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markOne(id: string) {
    await api.markNotificationRead(id);
    await load();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-xl border border-line bg-white px-3 py-2 text-navy hover:bg-canvas"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v2.2c0 .7-.2 1.4-.6 2L4 15.5h16l-1.4-2.3c-.4-.6-.6-1.3-.6-2V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 18a2.5 2.5 0 0 0 5 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 && (
          <span className="notif-dot absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-navy">Notifications</p>
            <Link
              to="/app/notifications"
              className="text-xs font-semibold text-action"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted">No notifications yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-canvas ${
                  n.read ? "opacity-70" : ""
                }`}
                onClick={() => {
                  void markOne(n.id);
                  setOpen(false);
                  navigate("/app/notifications");
                }}
              >
                <p className="text-sm font-semibold text-navy">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
