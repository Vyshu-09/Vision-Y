import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { PolicyClauseRow, PolicyRow } from "../types";

export function PolicyDetailPage() {
  const { id } = useParams();
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [clauses, setClauses] = useState<PolicyClauseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await api.policy(id);
        if (cancelled) return;
        setPolicy(data.policy);
        setClauses(
          (data.clauses as PolicyClauseRow[]).map((c) => ({
            id: c.id,
            policy_id: c.policy_id,
            policy_version_label: c.policy_version_label,
            clause_number: c.clause_number,
            sub_clause_number: c.sub_clause_number,
            clause_text: c.clause_text,
            section: c.section,
            section_number: c.section_number,
            section_title: c.section_title,
            chapter_number: c.chapter_number,
            chapter_title: c.chapter_title,
            parent_clause_id: c.parent_clause_id,
            hierarchy_path: c.hierarchy_path,
            page_number: c.page_number,
            source_document: c.source_document,
          })),
        );
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load policy");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-muted">Loading policy…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!policy) return <p className="text-muted">Policy not found.</p>;

  const family = policy.family_id ?? policy.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/app/policies" className="text-sm font-semibold text-action hover:underline">
          ← Back to library
        </Link>
        <h1 className="mt-2 font-display text-3xl text-navy">{policy.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {policy.category}
          {policy.department ? ` · ${policy.department}` : ""} · {policy.authority_level}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl text-navy">Policy metadata</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Status</dt>
            <dd className="font-semibold uppercase text-navy">
              {policy.status === "active" ? "CURRENT" : policy.status.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Version</dt>
            <dd className="font-semibold text-navy">{policy.version_label ?? policy.version_year}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Effective</dt>
            <dd className="font-semibold text-navy">
              {policy.effective_date}
              {policy.effective_until ? ` → ${policy.effective_until}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Family ID</dt>
            <dd className="break-all font-mono text-xs text-navy">{family}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Supersedes</dt>
            <dd className="font-semibold text-navy">
              {policy.supersedes_id ? (
                <Link className="text-action hover:underline" to={`/app/policies/${policy.supersedes_id}`}>
                  View prior version
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Document</dt>
            <dd className="font-semibold text-navy">{policy.document_name ?? policy.source_file_url ?? "—"}</dd>
          </div>
        </dl>
        {policy.description && <p className="mt-3 text-sm text-muted">{policy.description}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl text-navy">Clauses ({clauses.length})</h2>
        <div className="mt-3 space-y-3">
          {clauses.map((c) => (
            <article key={c.id} id={`clause-${c.clause_number}`} className="rounded-xl bg-parchment p-4">
              <p className="font-semibold text-navy">
                Clause {c.clause_number}
                {c.section ? ` · ${c.section}` : ""}
                {c.page_number != null ? ` · Page ${c.page_number}` : ""}
              </p>
              {c.hierarchy_path && <p className="mt-0.5 text-xs text-muted">{c.hierarchy_path}</p>}
              <p className="mt-2 text-sm leading-relaxed text-navy/85">{c.clause_text}</p>
            </article>
          ))}
          {clauses.length === 0 && <p className="text-sm text-muted">No clauses indexed.</p>}
        </div>
      </section>
    </div>
  );
}
