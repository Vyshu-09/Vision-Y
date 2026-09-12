import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth } from "../middleware/auth.js";

export const policiesRouter = Router();

policiesRouter.get("/", requireAuth, (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const status = String(req.query.status ?? "");
  const role = req.auth!.role;
  let list = store.listPolicies().filter((p) => role === "super_admin" || p.audience.includes(role));
  if (status) list = list.filter((p) => p.status === status);
  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        String(p.version_year).includes(q),
    );
  }
  res.json({
    policies: list.map((p) => ({
      ...p,
      clause_count: store.clausesForPolicy(p.id).length,
    })),
  });
});

policiesRouter.get("/circulars", requireAuth, (_req, res) => {
  res.json({ circulars: store.listCirculars() });
});

policiesRouter.get("/:id", requireAuth, (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  const role = req.auth!.role;
  if (role !== "super_admin" && !policy.audience.includes(role)) {
    res.status(403).json({ error: "Not authorized for this policy" });
    return;
  }
  res.json({
    policy,
    clauses: store.clausesForPolicy(policy.id).map(({ embedding_vector: _v, ...rest }) => rest),
  });
});
