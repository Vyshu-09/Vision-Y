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
import { parseIsoDate, validateEffectiveRange } from "../db/normalize.js";
import { syncVignanPolicies } from "../services/syncVignanPolicies.js";

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
      const version_label = req.body.version_label ? String(req.body.version_label).trim() : null;
      const effective_until_raw = req.body.effective_until ? String(req.body.effective_until).trim() : "";
      const effective_until = effective_until_raw ? parseIsoDate(effective_until_raw) : null;
      const description = req.body.description ? String(req.body.description).trim() : null;
      const approved_by = req.body.approved_by ? String(req.body.approved_by).trim() : null;
      const approval_date_raw = req.body.approval_date ? String(req.body.approval_date).trim() : "";
      const approval_date = approval_date_raw ? parseIsoDate(approval_date_raw) : null;
      const authority_level = (req.body.authority_level ?? "university") as AuthorityLevel;
      const department = req.body.department ? String(req.body.department) : null;

      if (!title || !category || !Number.isFinite(version_year) || !effective_date) {
        res.status(400).json({ error: "title, category, version_year, and effective_date are required" });
        return;
      }

      const rangeErr = validateEffectiveRange(effective_date, effective_until);
      if (rangeErr) {
        res.status(400).json({ error: rangeErr });
        return;
      }
      if (effective_until_raw && !effective_until) {
        res.status(400).json({ error: "effective_until must be a valid YYYY-MM-DD date or empty" });
        return;
      }

      let text = String(req.body.text ?? "");
      let source_file_url: string | null = null;
      let document_name: string | null = null;

      if (req.file) {
        source_file_url = req.file.path;
        document_name = req.file.originalname;
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
        version_label,
        effective_date,
        effective_until,
        authority_level,
        department,
        uploaded_by: req.auth!.userId,
        source_file_url: source_file_url ?? "pasted://text",
        document_name,
        description,
        approved_by,
        approval_date,
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
  const now = store.now();
  const updated = store.updatePolicy(policy.id, {
    status: "active",
    updated_at: now,
    approved_by: policy.approved_by ?? req.auth!.userId,
    approval_date: policy.approval_date ?? now.slice(0, 10),
  });

  if (policy.supersedes_id) {
    const older = store.getPolicy(policy.supersedes_id);
    if (older && older.status !== "superseded") {
      store.updatePolicy(older.id, {
        status: "superseded",
        superseded_by_id: policy.id,
        effective_until: older.effective_until ?? now.slice(0, 10),
        updated_at: now,
      });
    } else if (older && !older.superseded_by_id) {
      store.updatePolicy(older.id, { superseded_by_id: policy.id, updated_at: now });
    }
  }

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
  const now = store.now();
  store.updatePolicy(row.old_policy_id, {
    status: "superseded",
    superseded_by_id: row.new_policy_id,
    updated_at: now,
  });
  const newPol = store.getPolicy(row.new_policy_id);
  store.updatePolicy(row.new_policy_id, {
    status: "active",
    supersedes_id: newPol?.supersedes_id ?? row.old_policy_id,
    family_id: store.getPolicy(row.old_policy_id)?.family_id ?? newPol?.family_id,
    updated_at: now,
    approved_by: newPol?.approved_by ?? req.auth!.userId,
    approval_date: newPol?.approval_date ?? now.slice(0, 10),
  });
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
  const updated = store.updatePolicy(policy.id, {
    status: "superseded",
    updated_at: store.now(),
  });
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
  const now = store.now();
  const updated = store.updatePolicy(policy.id, {
    status: "superseded",
    updated_at: now,
    effective_until: policy.effective_until ?? now.slice(0, 10),
  });
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

/** Thin metadata update for Phase 1 admin fields (does not redesign dashboard). */
adminRouter.patch("/policies/:id/metadata", (req, res) => {
  const policy = store.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }

  const patch: Record<string, unknown> = { updated_at: store.now() };

  if (req.body.version_label != null) {
    const label = String(req.body.version_label).trim();
    if (!label) {
      res.status(400).json({ error: "version_label cannot be empty" });
      return;
    }
    patch.version_label = label;
  }
  if (req.body.effective_date != null) {
    const d = parseIsoDate(req.body.effective_date);
    if (!d) {
      res.status(400).json({ error: "effective_date must be YYYY-MM-DD" });
      return;
    }
    patch.effective_date = d;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "effective_until")) {
    const raw = req.body.effective_until;
    if (raw == null || raw === "") patch.effective_until = null;
    else {
      const d = parseIsoDate(raw);
      if (!d) {
        res.status(400).json({ error: "effective_until must be YYYY-MM-DD or empty" });
        return;
      }
      patch.effective_until = d;
    }
  }
  if (req.body.status != null) {
    const allowed = new Set(["active", "superseded", "under_review", "draft", "expired"]);
    const status = String(req.body.status);
    if (!allowed.has(status)) {
      res.status(400).json({ error: "invalid status" });
      return;
    }
    patch.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "supersedes_id")) {
    const sid = req.body.supersedes_id ? String(req.body.supersedes_id) : null;
    if (sid && !store.getPolicy(sid)) {
      res.status(400).json({ error: "supersedes_id policy not found" });
      return;
    }
    patch.supersedes_id = sid;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "approved_by")) {
    patch.approved_by = req.body.approved_by ? String(req.body.approved_by) : null;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "approval_date")) {
    const raw = req.body.approval_date;
    if (raw == null || raw === "") patch.approval_date = null;
    else {
      const d = parseIsoDate(raw);
      if (!d) {
        res.status(400).json({ error: "approval_date must be YYYY-MM-DD or empty" });
        return;
      }
      patch.approval_date = d;
    }
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    patch.description = req.body.description ? String(req.body.description) : null;
  }

  const nextFrom = String(patch.effective_date ?? policy.effective_date);
  const nextUntil =
    patch.effective_until !== undefined
      ? (patch.effective_until as string | null)
      : policy.effective_until;
  const rangeErr = validateEffectiveRange(nextFrom, nextUntil);
  if (rangeErr) {
    res.status(400).json({ error: rangeErr });
    return;
  }

  const updated = store.updatePolicy(policy.id, patch);
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

/** Pull official PDFs from https://vignan.ac.in/newvignan/policies.php (role audiences applied). */
adminRouter.post("/sync-vignan-policies", async (req, res) => {
  try {
    const replaceExisting = req.body?.replaceExisting !== false;
    const result = await syncVignanPolicies({
      replaceExisting,
      uploadedBy: req.auth!.userId,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
