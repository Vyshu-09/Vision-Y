import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { PolicyRow } from "../types";

export function PoliciesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const title =
    user?.role === "student"
      ? "My Policies"
      : user?.role === "faculty"
        ? "Academic Rules"
        : user?.role === "staff"
          ? "Admin Policies"
          : "Documents";

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await api.policies(q);
          setPolicies(data.policies);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load policies");
        }
      })();
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl text-navy">{title}</h1>
      <p className="mt-1 text-muted">Search active and historical policy documents for your role.</p>

      <input
        className="ui-input mt-5 max-w-md"
        placeholder="Search by title, category, or year…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-3">
        {policies.map((p) => (
          <li key={p.id} className="ui-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg text-navy">{p.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {p.category} · v{p.version_label ?? p.version_year} · {p.authority_level}
                  {p.department ? ` · ${p.department}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  p.status === "active"
                    ? "bg-emerald-50 text-emerald-800"
                    : p.status === "under_review"
                      ? "bg-orange-50 text-orange-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {p.status === "active" ? "CURRENT" : p.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted">
              Effective {p.effective_date}
              {p.effective_until ? ` → ${p.effective_until}` : ""}
              {p.clause_count != null ? ` · ${p.clause_count} clauses` : ""}
            </p>
            <Link to={`/app/policies/${p.id}`} className="ui-btn ui-btn-ghost mt-3 inline-flex text-sm">
              View Policy
            </Link>
          </li>
        ))}
        {policies.length === 0 && (
          <li className="ui-card px-4 py-8 text-center text-sm text-muted">No policies found.</li>
        )}
      </ul>
    </div>
  );
}
