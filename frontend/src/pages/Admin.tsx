import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../api/client";
import { DashboardInsights } from "../components/DashboardCharts";
import type { ClarificationTicket, ReviewQueue } from "../types";

export function AdminPage() {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationTicket[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const [q, c, n] = await Promise.all([
        api.reviewQueue(),
        api.clarifications(),
        api.notifications(),
      ]);
      setQueue(q);
      setClarifications(c.clarifications);
      setUnread(n.unread);
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

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || !queue) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [queue, clarifications]);

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
          (result.supersession_id ? " (supersession pending)" : "") +
          (result.new_conflicts ? ` · ${result.new_conflicts} conflict(s)` : "") +
          `. Activate to notify: ${selectedRoles(notifyRoles).join(", ") || "none"}.`,
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

  if (!queue) {
    return <p className="text-muted">{error ?? "Loading governance console…"}</p>;
  }

  const stats = queue.stats;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section
        className="overflow-hidden rounded-2xl border border-line text-white"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(11,42,102,0.92), rgba(37,99,235,0.78)), url(/images/login-campus.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="px-6 py-8 md:px-8 md:py-10">
          <p className="text-sm font-semibold tracking-wide text-white/75">Super Admin · Dashboard</p>
          <h1 className="mt-1 font-display text-3xl md:text-4xl">Policy control center</h1>
          <p className="mt-2 max-w-2xl text-white/85">
            Everything on one page — upload, versions, conflicts, clarifications, and flags. Jump to a
            section below.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            {(
              [
                ["upload", "Upload"],
                ["versions", "Versions"],
                ["conflicts", "Conflicts"],
                ["clarifications", "Clarifications"],
                ["flags", "Flags"],
              ] as const
            ).map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      )}

      <DashboardInsights
        title="Governance insights"
        subtitle="Hover charts to inspect the live review queue."
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
            label: "Supersessions",
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
          ["Documents", stats.documents],
          ["Active", stats.current],
          ["Pending reviews", stats.pending_reviews],
          ["Open conflicts", stats.conflicts],
          ["Open clarifications", stats.open_clarifications],
          ["Circulars", stats.circulars],
          ["Queries", stats.queries],
          ["Users", stats.users],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl text-navy">{value}</p>
          </div>
        ))}
      </section>

      <section id="upload" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl text-navy">Upload policy</h2>
        <form onSubmit={(e) => void upload(e)} className="mt-4 grid gap-3 md:grid-cols-2">
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
            <select className="ui-input mt-1" value={authority} onChange={(e) => setAuthority(e.target.value)}>
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
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="text-sm font-medium text-navy md:col-span-2">
            Or paste policy text
            <textarea
              className="ui-input mt-1"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste clause text if you are not uploading a file…"
            />
          </label>

          <fieldset className="rounded-xl border border-line bg-canvas/60 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-bold text-navy">Who can access this policy?</legend>
            <p className="mb-3 text-xs text-muted">Audience controls search &amp; library visibility. Admin always keeps access.</p>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-navy">
              {(["student", "faculty", "staff"] as const).map((r) => (
                <label key={r} className="inline-flex items-center gap-2 capitalize">
                  <input type="checkbox" checked={audience[r]} onChange={() => toggleAudience(r)} />
                  {r.replace("_", " ")}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-line bg-canvas/60 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-bold text-navy">Notify when activated</legend>
            <p className="mb-3 text-xs text-muted">
              Choose who gets an alert after you Activate / Approve. Use <strong>All</strong> or pick roles.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-ghost text-xs"
                onClick={() => setNotifyAll(true)}
              >
                Notify all
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-ghost text-xs"
                onClick={() => setNotifyAll(false)}
              >
                Notify none
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

      <QueueSection
        id="pending"
        title="Pending policies"
        empty="No standalone under-review policies."
        items={queue.pending_policies.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
            <div>
              <p className="font-semibold text-navy">{p.title}</p>
              <p className="text-xs text-muted">
                {p.category} · {p.version_year} · {p.clause_count ?? 0} clauses
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-primary text-sm"
                onClick={() =>
                  void api.activatePolicy(p.id, selectedRoles(notifyRoles)).then(async (res) => {
                    setMessage(
                      `Activated “${p.title}”. Notified: ${(res.notified_roles ?? []).join(", ") || "none"}.`,
                    );
                    await load();
                  })
                }
              >
                Activate & notify
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-ghost text-sm"
                onClick={() => void api.rejectPolicy(p.id).then(load)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      />

      <QueueSection
        id="versions"
        title="Supersession reviews"
        empty="No pending supersessions."
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
                        `Approved supersession. Notified: ${(res.notified_roles ?? []).join(", ") || "none"}.`,
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

      <QueueSection
        id="conflicts"
        title="Conflicts"
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

      <QueueSection
        id="flags"
        title="Flags"
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
                  onClick={() => void api.resolveFlag(f.id, "Resolved by admin").then(load)}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost text-sm"
                  onClick={() => void api.rejectFlag(f.id).then(load)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
      />

      <QueueSection
        id="clarifications"
        title="Clarifications"
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
    </div>
  );
}

function QueueSection({
  id,
  title,
  empty,
  items,
}: {
  id?: string;
  title: string;
  empty: string;
  items: ReactNode[];
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-xl text-navy">{title}</h2>
      <div className="mt-2">
        {items.length === 0 ? <p className="py-4 text-sm text-muted">{empty}</p> : items}
      </div>
    </section>
  );
}
