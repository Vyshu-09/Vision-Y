import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { config } from "../config.js";
import { store } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { extractTextFromFile, processUploadedPolicy } from "../services/documentProcessor.js";
import type { AuthorityLevel, Role } from "../types.js";
import { notifyForEvent } from "../services/notificationEngine.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const USER_ROLES: Role[] = ["student", "faculty", "staff"];

function parseRoles(raw: unknown): Role[] {
  const parts = Array.isArray(raw)
    ? raw.map(String)
    : String(raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const allowed = new Set<Role>(USER_ROLES);
  return parts.filter((p): p is Role => allowed.has(p as Role));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [".pdf", ".docx", ".txt", ".md"].includes(path.extname(file.originalname).toLowerCase());
    if (!ok) {
      cb(new Error("Only PDF, DOCX, or TXT files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("super_admin"));

adminRouter.get("/review-queue", (_req, res) => {
  const supersessions = store.listSupersessions().map((s) => ({
    ...s,
    old_policy: store.getPolicy(s.old_policy_id),
    new_policy: store.getPolicy(s.new_policy_id),
  }));
  const conflicts = store.listConflicts().map((c) => ({
    ...c,
    policy_a: store.getPolicy(c.policy_a_id),
    policy_b: store.getPolicy(c.policy_b_id),
  }));
  const flags = store.listFlags().map((f) => ({
    ...f,
    raiser: store.getUser(f.raised_by)
      ? {
          id: store.getUser(f.raised_by)!.id,
          name: store.getUser(f.raised_by)!.name,
          role: store.getUser(f.raised_by)!.role,
        }
      : null,
    policy: f.policy_id ? store.getPolicy(f.policy_id) : null,
  }));

  // New uploads wait here until Admin activates them (students/faculty only see Active policies)
  const linkedNewPolicyIds = new Set(
    store.listSupersessions().filter((s) => s.status === "pending").map((s) => s.new_policy_id),
  );
  const pending_policies = store
    .listPolicies()
    .filter((p) => p.status === "under_review" && !linkedNewPolicyIds.has(p.id))
    .map((p) => ({
      ...p,
      clause_count: store.clausesForPolicy(p.id).length,
    }));

  res.json({ supersessions, conflicts, flags, pending_policies, stats: store.stats(), circulars: store.listCirculars() });
});

adminRouter.get("/stats", (_req, res) => {
  res.json({ stats: store.stats() });
});

adminRouter.get("/circulars", (_req, res) => {
  res.json({ circulars: store.listCirculars() });
});

adminRouter.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (multerErr) => {
    if (multerErr) {
      const msg = multerErr instanceof Error ? multerErr.message : "File upload failed";
      res.status(400).json({ error: msg });
      return;
    }

    try {
      const title = String(req.body.title ?? "").trim();
      const category = String(req.body.category ?? "").trim();
      const version_year = Number(req.body.version_year);
      const effective_date = String(req.body.effective_date ?? "");
      const authority_level = (req.body.authority_level ?? "university") as AuthorityLevel;
      const department = req.body.department ? String(req.body.department) : null;

      if (!title || !category || !Number.isFinite(version_year) || !effective_date) {
        res.status(400).json({ error: "title, category, version_year, and effective_date are required" });
        return;
      }

      let text = String(req.body.text ?? "");
      let source_file_url: string | null = null;

      if (req.file) {
        source_file_url = req.file.path;
        text = await extractTextFromFile(req.file.path, req.file.originalname);
      }

      if (!text.trim()) {
        res.status(400).json({
          error: "Provide a PDF/DOCX/TXT file with readable text, or paste policy text below.",
        });
        return;
      }

      const audience = parseRoles(req.body.audience);

      const result = processUploadedPolicy({
        title,
        category,
        version_year,
        effective_date,
        authority_level,
        department,
        uploaded_by: req.auth!.userId,
        source_file_url: source_file_url ?? "pasted://text",
        text,
        audience: audience.length ? audience : undefined,
      });

      res.status(201).json({
        policy: result.policy,
        clause_count: result.clauses.length,
        supersession_id: result.supersession_id,
        new_conflicts: result.new_conflicts,
      });
    } catch (err) {
      console.error("[admin/upload]", err);
      const message = err instanceof Error ? err.message : "Failed to process document";
      res.status(500).json({ error: message });
    }
  });
});

adminRouter.post("/policies/:id/activate", (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy || policy.status !== "under_review") {
    res.status(404).json({ error: "Under-review policy not found" });
    return;
  }
  const updated = store.updatePolicy(policy.id, { status: "active" });

  // If notify_roles is sent (including []), use it; otherwise default to audience (non-admin)
  const bodyHasNotify = req.body && Object.prototype.hasOwnProperty.call(req.body, "notify_roles");
  let notifyRoles = parseRoles(req.body?.notify_roles);
  if (!bodyHasNotify) {
    notifyRoles = policy.audience.filter((r) => r !== "super_admin");
  }
  if (notifyRoles.length) {
    notifyForEvent({
      event: "policy_updated",
      roles: notifyRoles,
      severity: "warning",
      title: `New policy published: ${policy.title}`,
      body: `${policy.category} (${policy.version_year}) is now CURRENT. Open Policies to review the official clauses.`,
      policyId: policy.id,
    });
  }
  // Admin always gets a confirmation copy
  notifyForEvent({
    event: "policy_updated",
    roles: ["super_admin"],
    severity: "info",
    title: `Published & notified: ${policy.title}`,
    body: `Activated for audience [${policy.audience.join(", ")}]. Alerts sent to: ${notifyRoles.join(", ") || "none"}.`,
    policyId: policy.id,
  });

  res.json({ policy: updated, notified_roles: notifyRoles });
});

adminRouter.post("/supersessions/:id/approve", (req, res) => {
  const row = store.supersessions.get(req.params.id);
  if (!row || row.status !== "pending") {
    res.status(404).json({ error: "Pending supersession not found" });
    return;
  }
  store.updatePolicy(row.old_policy_id, { status: "superseded" });
  store.updatePolicy(row.new_policy_id, { status: "active" });
  const updated = store.updateSupersession(row.id, { status: "approved" });

  const newPolicy = store.getPolicy(row.new_policy_id);
  const bodyHasNotify = req.body && Object.prototype.hasOwnProperty.call(req.body, "notify_roles");
  let notifyRoles = parseRoles(req.body?.notify_roles);
  if (!bodyHasNotify && newPolicy) {
    notifyRoles = newPolicy.audience.filter((r) => r !== "super_admin");
  }
  if (newPolicy && notifyRoles.length) {
    notifyForEvent({
      event: "policy_updated",
      roles: notifyRoles,
      severity: "warning",
      title: `Policy updated: ${newPolicy.title}`,
      body: `A new version is CURRENT and may replace prior rules. Review the updated clauses.`,
      policyId: newPolicy.id,
    });
  }

  res.json({ supersession: updated, notified_roles: notifyRoles });
});

adminRouter.post("/policies/:id/reject", (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy || policy.status !== "under_review") {
    res.status(404).json({ error: "Under-review policy not found" });
    return;
  }
  const updated = store.updatePolicy(policy.id, { status: "superseded" });
  res.json({ policy: updated });
});

/** Mark an active (or under-review) policy as superseded — still stored, not searchable as CURRENT. */
adminRouter.post("/policies/:id/supersede", (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  if (policy.status === "superseded") {
    res.status(400).json({ error: "Policy is already superseded" });
    return;
  }
  const updated = store.updatePolicy(policy.id, { status: "superseded" });
  notifyForEvent({
    event: "policy_updated",
    roles: ["super_admin"],
    severity: "warning",
    title: `Policy superseded: ${policy.title}`,
    body: `${policy.title} (${policy.version_year}) was marked superseded by Super Admin.`,
    policyId: policy.id,
  });
  res.json({ policy: updated });
});

/** Permanently remove a policy and its clauses from the store. */
adminRouter.delete("/policies/:id", (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  const ok = store.deletePolicy(policy.id);
  if (!ok) {
    res.status(500).json({ error: "Delete failed" });
    return;
  }
  notifyForEvent({
    event: "policy_updated",
    roles: ["super_admin"],
    severity: "critical",
    title: `Policy deleted: ${policy.title}`,
    body: `${policy.title} (${policy.version_year}) was permanently deleted by Super Admin.`,
  });
  res.json({ ok: true, deleted_id: policy.id });
});

adminRouter.post("/supersessions/:id/reject", (req, res) => {
  const row = store.supersessions.get(req.params.id);
  if (!row || row.status !== "pending") {
    res.status(404).json({ error: "Pending supersession not found" });
    return;
  }
  store.updatePolicy(row.new_policy_id, { status: "superseded" });
  const updated = store.updateSupersession(row.id, { status: "rejected" });
  res.json({ supersession: updated });
});

adminRouter.post("/conflicts/:id/resolve", (req, res) => {
  const notes = String(req.body.resolution_notes ?? "").trim();
  const updated = store.updateConflict(req.params.id, {
    status: "resolved",
    resolved_by: req.auth!.userId,
    description: notes
      ? `${store.conflicts.get(req.params.id)?.description ?? ""}\nResolution: ${notes}`
      : store.conflicts.get(req.params.id)?.description ?? "",
  });
  if (!updated) {
    res.status(404).json({ error: "Conflict not found" });
    return;
  }
  res.json({ conflict: updated });
});

adminRouter.post("/conflicts/:id/reject", (req, res) => {
  const updated = store.updateConflict(req.params.id, {
    status: "resolved",
    resolved_by: req.auth!.userId,
    description: `${store.conflicts.get(req.params.id)?.description ?? ""}\nMarked as not a conflict by admin.`,
  });
  if (!updated) {
    res.status(404).json({ error: "Conflict not found" });
    return;
  }
  res.json({ conflict: updated });
});

adminRouter.post("/flags/:id/resolve", (req, res) => {
  const notes = String(req.body.resolution_notes ?? "").trim();
  const existing = store.flags.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Flag not found — refresh Flags and try again" });
    return;
  }
  // Idempotent: already closed flags are fine for demo / double-clicks
  if (existing.status !== "open") {
    res.json({ flag: existing, already_resolved: true });
    return;
  }
  const updated = store.updateFlag(req.params.id, {
    status: "resolved",
    resolution_notes: notes || "Resolved by admin",
  });
  if (!updated) {
    res.status(404).json({ error: "Flag not found" });
    return;
  }

  // Notify the faculty/staff member who raised the flag
  notifyForEvent({
    event: "review_pending",
    roles: [],
    userId: existing.raised_by,
    severity: "info",
    title: "Your flag was resolved",
    body:
      notes ||
      "Super Admin reviewed and resolved the policy flag you raised. Open Notifications for details.",
    policyId: existing.policy_id,
  });

  res.json({ flag: updated });
});

adminRouter.post("/flags/:id/reject", (req, res) => {
  const existing = store.flags.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Flag not found — refresh Flags and try again" });
    return;
  }
  if (existing.status !== "open") {
    res.json({ flag: existing, already_resolved: true });
    return;
  }
  const updated = store.updateFlag(req.params.id, {
    status: "resolved",
    resolution_notes: "Rejected by admin — no policy change required",
  });
  if (!updated) {
    res.status(404).json({ error: "Flag not found" });
    return;
  }

  notifyForEvent({
    event: "review_pending",
    roles: [],
    userId: existing.raised_by,
    severity: "info",
    title: "Your flag was closed",
    body: "Super Admin reviewed your flag and closed it — no policy change was required.",
    policyId: existing.policy_id,
  });

  res.json({ flag: updated });
});
