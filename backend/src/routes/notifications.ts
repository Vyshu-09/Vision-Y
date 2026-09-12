import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";
import { markAllNotificationsRead, markNotificationRead } from "../services/notificationEngine.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, (req, res) => {
  const auth = req.auth!;
  const notifications = store.listNotificationsFor(auth.userId, auth.role);
  res.json({
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  });
});

notificationsRouter.post("/:id/read", requireAuth, (req, res) => {
  const auth = req.auth!;
  const updated = markNotificationRead(req.params.id, auth.userId, auth.role);
  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json({ notification: updated });
});

notificationsRouter.post("/read-all", requireAuth, (req, res) => {
  const auth = req.auth!;
  const notifications = markAllNotificationsRead(auth.userId, auth.role);
  res.json({ notifications, unread: 0 });
});
