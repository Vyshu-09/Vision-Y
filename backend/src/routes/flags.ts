import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyForEvent } from "../services/notificationEngine.js";

export const flagsRouter = Router();

flagsRouter.post("/", requireAuth, requireRole("student", "faculty", "staff", "super_admin"), (req, res) => {
  const { policy_id, query_id, reason } = req.body as {
    policy_id?: string;
    query_id?: string;
    reason?: string;
  };
  if (!reason?.trim()) {
    res.status(400).json({ error: "reason is required" });
    return;
  }
  const flag = store.insertFlag({
    id: store.newId(),
    raised_by: req.auth!.userId,
    policy_id: policy_id ?? null,
    query_id: query_id ?? null,
    reason: reason.trim(),
    status: "open",
    resolution_notes: null,
    created_at: store.now(),
  });
  notifyForEvent({
    event: "review_pending",
    roles: ["super_admin"],
    severity: "warning",
    title: "Policy flag raised",
    body: reason.trim(),
    policyId: policy_id ?? null,
  });
  res.status(201).json({ flag });
});
