import { Router } from "express";
import { z } from "zod";
import { store } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyForEvent } from "../services/notificationEngine.js";
import type { Role } from "../types.js";

export const clarificationsRouter = Router();

const createSchema = z.object({
  question_text: z.string().min(3),
  answer_text: z.string().min(1),
  reason: z.string().min(3),
  policy_id: z.string().optional().nullable(),
});

clarificationsRouter.post("/", requireAuth, requireRole("student"), (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "question_text, answer_text, and reason are required" });
    return;
  }

  const assigned_roles: Role[] = ["faculty", "staff", "super_admin"];
  const ticket = store.insertClarification({
    id: store.newId(),
    raised_by: req.auth!.userId,
    question_text: parsed.data.question_text.trim(),
    answer_text: parsed.data.answer_text.trim(),
    reason: parsed.data.reason.trim(),
    status: "open",
    assigned_roles,
    resolution_notes: null,
    resolved_by: null,
    policy_id: parsed.data.policy_id ?? null,
    created_at: store.now(),
    resolved_at: null,
  });

  notifyForEvent({
    event: "clarification_request",
    roles: assigned_roles,
    severity: "warning",
    title: "Student clarification request",
    body: `${req.auth!.name} reported an answer mismatch: ${ticket.reason}`,
    policyId: ticket.policy_id,
  });

  res.status(201).json({ clarification: ticket });
});

clarificationsRouter.get("/", requireAuth, (req, res) => {
  const auth = req.auth!;
  const tickets = store.listClarificationsForRole(auth.role, auth.userId).map((t) => ({
    ...t,
    raiser: store.getUser(t.raised_by)
      ? {
          id: store.getUser(t.raised_by)!.id,
          name: store.getUser(t.raised_by)!.name,
          role: store.getUser(t.raised_by)!.role,
        }
      : null,
    policy: t.policy_id ? store.getPolicy(t.policy_id) : null,
  }));
  res.json({ clarifications: tickets });
});

clarificationsRouter.post(
  "/:id/resolve",
  requireAuth,
  requireRole("faculty", "staff", "super_admin"),
  (req, res) => {
    const notes = String(req.body?.resolution_notes ?? "").trim();
    const existing = store.clarifications.get(req.params.id);
    if (!existing || existing.status !== "open") {
      res.status(404).json({ error: "Open clarification not found" });
      return;
    }

    const updated = store.updateClarification(existing.id, {
      status: "resolved",
      resolution_notes: notes || "Resolved by reviewer",
      resolved_by: req.auth!.userId,
      resolved_at: store.now(),
    });

    notifyForEvent({
      event: "clarification_request",
      roles: ["student"],
      severity: "info",
      title: "Clarification resolved",
      body: updated?.resolution_notes ?? "Your clarification request was resolved.",
      policyId: existing.policy_id,
      userId: existing.raised_by,
    });

    res.json({ clarification: updated });
  },
);
