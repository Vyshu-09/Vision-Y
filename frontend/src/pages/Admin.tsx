import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { DashboardInsights } from "../components/DashboardCharts";
import type { ClarificationTicket, PolicyRow, ReviewQueue } from "../types";

export type AdminSection =
  | "overview"
  | "upload"
  | "manage"
  | "review"
  | "versions"
  | "conflicts"
  | "flags"
  | "clarifications";

const SECTION_META: Record<AdminSection, { title: string; blurb: string }> = {
  overview: {
    title: "Policy control center",
    blurb: "Live governance counts. Use the sidebar to open Upload, Manage, Review, and other tools.",
  },
  upload: {
    title: "Upload policy",
    blurb: "Add a new Academic policy or Circular. It lands in the review queue until you activate it.",
  },
  manage: {
    title: "Manage policies",
    blurb: "View, retire (supersede), or delete policies. Retire keeps the document archived — it is no longer CURRENT.",
  },
  review: {
    title: "Pending review",
    blurb: "Approve new uploads to make them CURRENT, or retire / delete them.",
  },
  versions: {
    title: "Version reviews",
    blurb: "When a new upload may replace an older policy, approve or reject the supersession here.",
  },
  conflicts: {
    title: "Conflicts",
    blurb: "Detected contradictions between clauses. The agent informs — you decide.",
  },
  flags: {
    title: "Flags",
    blurb: "Issues raised by faculty/staff for admin follow-up.",
  },
  clarifications: {
    title: "Clarifications",
    blurb: "Student tickets asking for clearer policy answers.",
  },
};

export function AdminPage({ section: sectionProp }: { section?: AdminSection }) {
  const params = useParams();
  const section = (sectionProp ?? (params.section as AdminSection) ?? "overview") as AdminSection;

  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationTicket[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewClauses, setViewClauses] = useState<{ clause_number: string; clause_text: string; section: string }[]>(
    [],
  );

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Academic");
  const [versionYear, setVersionYear] = useState(String(new Date().getFullYear()));
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [authority, setAuthority] = useState("university");
  const [department, setDepartment] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audience, setAudience] = useState({ student: true, faculty: true, staff: true });
  const [notifyRoles, setNotifyRoles] = useState({ student: true, faculty: true, staff: true });

  function toggleAudience(key: keyof typeof audience) {
    setAudience((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleNotify(key: keyof typeof notifyRoles) {
    setNotifyRoles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectedRoles(map: Record<string, boolean>) {
    return Object.entries(map)
      .filter(([, on]) => on)
      .map(([k]) => k);
  }

  function setNotifyAll(on: boolean) {
    setNotifyRoles({ student: on, faculty: on, staff: on });
  }

  async function load() {
    try {
      const [q, c, n, p] = await Promise.all([
        api.reviewQueue(),
        api.clarifications(),
        api.notifications(),
        api.policies(),
      ]);
      setQueue(q);
      setClarifications(c.clarifications);
      setUnread(n.unread);
      setPolicies(p.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin queue");
    }
  }

  useEffect(() => {
    void load();
    const tick = window.setInterval(() => void load(), 12_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function upload(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("category", category);
      form.set("version_year", versionYear);
      form.set("effective_date", effectiveDate);
      form.set("authority_level", authority);
      if (department.trim()) form.set("department", department.trim());
      if (text.trim()) form.set("text", text.trim());
      if (file) form.set("file", file);
      const aud = selectedRoles(audience);
      if (aud.length) form.set("audience", aud.join(","));
      const result = await api.uploadPolicy(form);
      setMessage(
        `Uploaded “${result.policy.title}” with ${result.clause_count} clauses` +
          (result.supersession_id ? " (version review pending)" : "") +
          (result.new_conflicts ? ` · ${result.new_conflicts} conflict(s)` : "") +
          `. Activate from Review.`,
      );
      setTitle("");
      setText("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewPolicy(id: string) {
    if (viewingId === id) {
      setViewingId(null);
      setViewClauses([]);
      return;
    }
    try {
      const data = await api.policy(id);
      setViewingId(id);
      setViewClauses(
        (data.clauses as { clause_number: string; clause_text: string; section: string }[]).map((c) => ({
          clause_number: c.clause_number,
          clause_text: c.clause_text,
          section: c.section,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load policy");
    }
  }

  if (!queue) {
    return <p className="text-muted">{error ?? "Loading governance console…"}</p>;
  }

  const stats = queue.stats;
  const meta = SECTION_META[section] ?? SECTION_META.overview;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Super Admin</p>
        <h1 className="font-display text-3xl text-navy">{meta.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{meta.blurb}</p>
      </header>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      )}

      {section === "overview" && (
        <>
          <DashboardInsights
            title="Governance insights"
            subtitle="Open a sidebar item to work on one queue at a time."
            pieTitle="Policy / review mix"
            barTitle="Open queue"
            slices={[
              { label: "Active", value: stats.current, color: "#2563eb" },
              { label: "Pending", value: stats.pending_reviews, color: "#3b82f6" },
              { label: "Conflicts", value: stats.conflicts, color: "#1d4ed8" },
              { label: "Clarifications", value: stats.open_clarifications, color: "#60a5fa" },
            ].filter((s) => s.value > 0)}
            bars={[
              {
                label: "Conflicts",
                value: queue.conflicts.filter((c) => c.status === "open").length || stats.conflicts,
                color: "#1d4ed8",
              },
              {
                label: "Flags",
                value: queue.flags.filter((f) => f.status === "open").length,
                color: "#2563eb",
              },
              {
                label: "Clarifications",
                value: clarifications.filter((c) => c.status === "open").length || stats.open_clarifications,
                color: "#3b82f6",
              },
              {
                label: "Versions",
                value: queue.supersessions.filter((s) => s.status === "pending").length,
                color: "#60a5fa",
              },
            ]}
            unread={unread}
            accent="#2563eb"
            extras={[
              { label: "Documents", value: stats.documents },
              { label: "Users", value: stats.users },
              { label: "Queries", value: stats.queries },
            ]}
          />
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Documents", stats.documents, "/app/admin/manage"],
              ["Active", stats.current, "/app/admin/manage"],
              ["Pending reviews", stats.pending_reviews, "/app/admin/review"],
              ["Open conflicts", stats.conflicts, "/app/admin/conflicts"],
            ].map(([label, value, to]) => (
              <Link
                key={String(label)}
                to={String(to)}
                className="rounded-2xl border border-line bg-white p-4 transition hover:border-action"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 font-display text-2xl text-navy">{value}</p>
              </Link>
            ))}
          </section>
        </>
      )}

      {section === "upload" && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <form onSubmit={(e) => void upload(e)} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-navy">
              Title
              <input className="ui-input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="text-sm font-medium text-navy">
              Category
              <select
                className="ui-input mt-1"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="Academic">Academic</option>
                <option value="Circular">Circular</option>
              </select>
            </label>
            <label className="text-sm font-medium text-navy">
              Version year
              <input
                className="ui-input mt-1"
                type="number"
                value={versionYear}
                onChange={(e) => setVersionYear(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-navy">
              Effective date
              <input
                className="ui-input mt-1"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-navy">
              Authority
              <select
                className="ui-input mt-1"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
              >
                <option value="university">University</option>
                <option value="department">Department</option>
              </select>
            </label>
            <label className="text-sm font-medium text-navy">
              Department (optional)
              <input
                className="ui-input mt-1"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-navy md:col-span-2">
              File (PDF / DOCX / TXT)
              <input
                className="ui-input mt-1"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="text-sm font-medium text-navy md:col-span-2">
              Or paste policy text
              <textarea
                className="ui-input mt-1 min-h-28"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste clause text if you are not uploading a file…"
              />
            </label>
            <fieldset className="rounded-xl border border-line p-3 md:col-span-2">
              <legend className="px-1 text-sm font-bold text-navy">Who can access this policy?</legend>
              <p className="mb-2 text-xs text-muted">Audience controls search &amp; library visibility.</p>
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-navy">
                {(["student", "faculty", "staff"] as const).map((r) => (
                  <label key={r} className="inline-flex items-center gap-2 capitalize">
                    <input type="checkbox" checked={audience[r]} onChange={() => toggleAudience(r)} />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="rounded-xl border border-line p-3 md:col-span-2">
              <legend className="px-1 text-sm font-bold text-navy">Notify when activated</legend>
              <div className="mb-2 flex gap-2">
                <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setNotifyAll(true)}>
                  All
                </button>
                <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setNotifyAll(false)}>
                  None
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-navy">
                {(["student", "faculty", "staff"] as const).map((r) => (
                  <label key={r} className="inline-flex items-center gap-2 capitalize">
                    <input type="checkbox" checked={notifyRoles[r]} onChange={() => toggleNotify(r)} />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="md:col-span-2">
              <button type="submit" disabled={busy} className="ui-btn ui-btn-primary">
                {busy ? "Processing…" : "Upload to review queue"}
              </button>
            </div>
          </form>
        </section>
      )}

      {section === "review" && (
        <QueueSection
          title="Pending policies"
          empty="No under-review policies."
          items={queue.pending_policies.map((p) => (
            <PolicyRowActions
              key={p.id}
              title={p.title}
              meta={`${p.category} · ${p.version_year} · ${p.clause_count ?? 0} clauses`}
              viewing={viewingId === p.id}
              clauses={viewingId === p.id ? viewClauses : []}
              onView={() => void viewPolicy(p.id)}
              primaryLabel="Approve & activate"
              onPrimary={() =>
                void api.activatePolicy(p.id, selectedRoles(notifyRoles)).then(async (res) => {
                  setMessage(
                    `Activated “${p.title}”. Notified: ${(res.notified_roles ?? []).join(", ") || "none"}.`,
                  );
                  await load();
                })
              }
              onRetire={() =>
                void api.supersedePolicy(p.id).then(async () => {
                  setMessage(`Retired “${p.title}” (archived — not CURRENT).`);
                  await load();
                })
              }
              onDelete={() => {
                if (!window.confirm(`Permanently delete “${p.title}”?`)) return;
                void api.deletePolicy(p.id).then(async () => {
                  setMessage(`Deleted “${p.title}”.`);
                  await load();
                });
              }}
            />
          ))}
        />
      )}

      {section === "manage" && (
        <QueueSection
          title="All policies"
          empty="No policies in the library."
          items={policies.map((p) => (
            <PolicyRowActions
              key={p.id}
              title={p.title}
              meta={`${p.category} · ${p.version_year} · ${p.authority_level} · ${
                p.status === "active" ? "CURRENT" : p.status.replace("_", " ").toUpperCase()
              }`}
              viewing={viewingId === p.id}
              clauses={viewingId === p.id ? viewClauses : []}
              onView={() => void viewPolicy(p.id)}
              primaryLabel={p.status === "under_review" ? "Approve & activate" : undefined}
              onPrimary={
                p.status === "under_review"
                  ? () =>
                      void api.activatePolicy(p.id, selectedRoles(notifyRoles)).then(async (res) => {
                        setMessage(
                          `Activated “${p.title}”. Notified: ${(res.notified_roles ?? []).join(", ") || "none"}.`,
                        );
                        await load();
                      })
                  : undefined
              }
              onRetire={
                p.status !== "superseded"
                  ? () =>
                      void api.supersedePolicy(p.id).then(async () => {
                        setMessage(`Retired “${p.title}” (kept in archive, not shown as CURRENT).`);
                        await load();
                      })
                  : undefined
              }
              onDelete={() => {
                if (!window.confirm(`Permanently delete “${p.title}”? This cannot be undone.`)) return;
                void api.deletePolicy(p.id).then(async () => {
                  setMessage(`Deleted “${p.title}”.`);
                  setViewingId(null);
                  await load();
                });
              }}
            />
          ))}
        />
      )}

      {section === "versions" && (
        <QueueSection
          title="Supersession reviews"
          empty="No pending version reviews."
          items={queue.supersessions
            .filter((s) => s.status === "pending")
            .map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                <div>
                  <p className="font-semibold text-navy">
                    {s.old_policy?.title ?? s.old_policy_id} → {s.new_policy?.title ?? s.new_policy_id}
                  </p>
                  <p className="text-xs text-muted">Created {new Date(s.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary text-sm"
                    onClick={() =>
                      void api.approveSupersession(s.id, selectedRoles(notifyRoles)).then(async (res) => {
                        setMessage(
                          `Approved version change. Notified: ${(res.notified_roles ?? []).join(", ") || "none"}.`,
                        );
                        await load();
                      })
                    }
                  >
                    Approve & notify
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-ghost text-sm"
                    onClick={() => void api.rejectSupersession(s.id).then(load)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
        />
      )}

      {section === "conflicts" && (
        <QueueSection
          title="Open conflicts"
          empty="No open conflicts."
          items={queue.conflicts
            .filter((c) => c.status === "open")
            .map((c) => (
              <div key={c.id} className="border-b border-line py-3">
                <p className="font-semibold text-navy">
                  {c.policy_a?.title ?? c.policy_a_id} vs {c.policy_b?.title ?? c.policy_b_id}
                </p>
                <p className="mt-1 text-sm text-muted">{c.description}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary text-sm"
                    onClick={() => void api.resolveConflict(c.id, "Resolved by admin").then(load)}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-ghost text-sm"
                    onClick={() => void api.rejectConflict(c.id).then(load)}
                  >
                    Not a conflict
                  </button>
                </div>
              </div>
            ))}
        />
      )}

      {section === "flags" && (
        <QueueSection
          title="Open flags"
          empty="No open flags."
          items={queue.flags
            .filter((f) => f.status === "open")
            .map((f) => (
              <div key={f.id} className="border-b border-line py-3">
                <p className="font-semibold text-navy">{f.reason}</p>
                <p className="text-xs text-muted">
                  {f.raiser?.name ?? "Unknown"} · {f.policy?.title ?? "No policy linked"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary text-sm"
                    onClick={() =>
                      void api
                        .resolveFlag(f.id, "Resolved by admin")
                        .then(async () => {
                          setMessage("Flag resolved.");
                          await load();
                        })
                        .catch(async (err) => {
                          setError(err instanceof Error ? err.message : "Could not resolve flag");
                          await load();
                        })
                    }
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-ghost text-sm"
                    onClick={() =>
                      void api
                        .rejectFlag(f.id)
                        .then(async () => {
                          setMessage("Flag rejected.");
                          await load();
                        })
                        .catch(async (err) => {
                          setError(err instanceof Error ? err.message : "Could not reject flag");
                          await load();
                        })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
        />
      )}

      {section === "clarifications" && (
        <QueueSection
          title="Clarification tickets"
          empty="No clarification tickets."
          items={clarifications.map((c) => (
            <div key={c.id} className="border-b border-line py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{c.status}</p>
              <p className="font-semibold text-navy">{c.question_text}</p>
              <p className="mt-1 text-sm text-muted">{c.reason}</p>
              {c.status === "open" && (
                <button
                  type="button"
                  className="ui-btn ui-btn-primary mt-2 text-sm"
                  onClick={() =>
                    void api.resolveClarification(c.id, "Resolved by super admin").then(load)
                  }
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        />
      )}
    </div>
  );
}

function PolicyRowActions({
  title,
  meta,
  viewing,
  clauses,
  onView,
  primaryLabel,
  onPrimary,
  onRetire,
  onDelete,
}: {
  title: string;
  meta: string;
  viewing: boolean;
  clauses: { clause_number: string; clause_text: string; section: string }[];
  onView: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  onRetire?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-b border-line py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">{title}</p>
          <p className="text-xs text-muted">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn ui-btn-ghost text-sm" onClick={onView}>
            {viewing ? "Hide" : "View"}
          </button>
          {primaryLabel && onPrimary && (
            <button type="button" className="ui-btn ui-btn-primary text-sm" onClick={onPrimary}>
              {primaryLabel}
            </button>
          )}
          {onRetire && (
            <button
              type="button"
              className="ui-btn ui-btn-ghost text-sm"
              title="Retire this policy: it stays in the archive but is no longer CURRENT (superseded)."
              onClick={onRetire}
            >
              Retire
            </button>
          )}
          <button type="button" className="ui-btn ui-btn-ghost text-sm text-red-700" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      {viewing && (
        <div className="mt-3 space-y-2 rounded-xl bg-parchment p-3">
          {clauses.length === 0 ? (
            <p className="text-sm text-muted">No clauses indexed for this policy.</p>
          ) : (
            clauses.map((c) => (
              <article key={c.clause_number} className="rounded-lg bg-white/80 p-3 text-sm">
                <p className="font-semibold text-navy">
                  Clause {c.clause_number}
                  {c.section ? ` · ${c.section}` : ""}
                </p>
                <p className="mt-1 text-navy/80">{c.clause_text}</p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function QueueSection({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: ReactNode[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-xl text-navy">{title}</h2>
      <div className="mt-2">
        {items.length === 0 ? <p className="py-4 text-sm text-muted">{empty}</p> : items}
      </div>
    </section>
  );
}
