import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyForEvent } from "../services/notificationEngine.js";

export const circularsRouter = Router();

circularsRouter.get("/", requireAuth, (_req, res) => {
  res.json({ circulars: store.listCirculars() });
});

circularsRouter.get("/:id", requireAuth, (req, res) => {
  const circular = store.getCircular(req.params.id);
  if (!circular) {
    res.status(404).json({ error: "Circular not found" });
    return;
  }
  const policy = circular.modifies_policy_id ? store.getPolicy(circular.modifies_policy_id) : null;
  res.json({ circular, policy });
});

circularsRouter.post("/", requireAuth, requireRole("super_admin", "staff"), (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const circular_number = String(req.body?.circular_number ?? "").trim();
  const issued_date = String(req.body?.issued_date ?? "").trim() || store.now().slice(0, 10);
  const description = String(req.body?.description ?? "").trim();
  const modifies_policy_id = req.body?.modifies_policy_id ? String(req.body.modifies_policy_id) : null;

  if (!title || !circular_number || !description) {
    res.status(400).json({ error: "title, circular_number, and description are required" });
    return;
  }

  const circular = store.insertCircular({
    id: store.newId(),
    title,
    circular_number,
    issued_date,
    description,
    status: "active",
    modifies_policy_id,
    document_url: req.body?.document_url ? String(req.body.document_url) : null,
  });

  notifyForEvent({
    event: "circular_published",
    roles: ["student", "faculty", "staff", "super_admin"],
    severity: "warning",
    title: `Circular published: ${circular.circular_number}`,
    body: circular.title,
    policyId: circular.modifies_policy_id,
  });

  res.status(201).json({ circular });
});
