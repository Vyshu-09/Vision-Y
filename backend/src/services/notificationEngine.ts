import { store } from "../db/store.js";
import type { NotificationEventType, NotificationSeverity, Role } from "../types.js";

export interface NotifyForEventInput {
  event: NotificationEventType;
  roles: Role[];
  severity: NotificationSeverity;
  title: string;
  body: string;
  policyId?: string | null;
  userId?: string | null;
}

/**
 * Role/permission-aware notification fan-out.
 * user_id null => broadcast to role_targets; otherwise direct to one user.
 */
export function notifyForEvent(input: NotifyForEventInput) {
  const notification = store.insertNotification({
    id: store.newId(),
    user_id: input.userId ?? null,
    role_targets: input.roles,
    severity: input.severity,
    title: input.title,
    body: input.body,
    event_type: input.event,
    policy_id: input.policyId ?? null,
    read: false,
    created_at: store.now(),
  });
  return notification;
}

export function markNotificationRead(id: string, userId: string, role: Role) {
  const n = store.notifications.get(id);
  if (!n) return null;
  const visible =
    (n.user_id && n.user_id === userId) || (!n.user_id && n.role_targets.includes(role));
  if (!visible) return null;
  return store.updateNotification(id, { read: true });
}

export function markAllNotificationsRead(userId: string, role: Role) {
  const list = store.listNotificationsFor(userId, role);
  for (const n of list) {
    if (!n.read) store.updateNotification(n.id, { read: true });
  }
  return store.listNotificationsFor(userId, role);
}
