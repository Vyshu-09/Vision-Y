import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { SourceCard } from "../components/SourceCard";
import type { ClarificationTicket, QueryRecord } from "../types";

export function HistoryPage() {
  const { user } = useAuth();
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [clarifications, setClarifications] = useState<ClarificationTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  const title = user?.role === "student" ? "My Questions" : "History";
  const canResolve =
    user?.role === "faculty" || user?.role === "staff" || user?.role === "super_admin";

  async function load() {
    try {
      const [h, c] = await Promise.all([api.chatHistory(), api.clarifications()]);
      setQueries(h.queries);
      setClarifications(c.clarifications);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (window.location.hash === "#clarifications") {
      document.getElementById("clarifications")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [clarifications]);

  async function resolve(id: string) {
    await api.resolveClarification(id, resolveNotes[id] || "Resolved");
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        <p className="mt-1 text-muted">Your recent Agent 53 conversations and clarification tickets.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="font-display text-xl text-navy">Chat history</h2>
        <ul className="mt-4 space-y-3">
          {queries.map((q) => (
            <li key={q.id} className="ui-card p-5">
              <p className="text-xs text-muted">{new Date(q.created_at).toLocaleString()}</p>
              <p className="mt-1 font-semibold text-navy">{q.question_text}</p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-navy/85">
                {q.answer_text}
              </p>
              <SourceCard sources={q.sources} />
            </li>
          ))}
          {queries.length === 0 && (
            <li className="ui-card px-4 py-8 text-center text-sm text-muted">No questions yet.</li>
          )}
        </ul>
      </section>

      <section id="clarifications" className="scroll-mt-24">
        <h2 className="font-display text-xl text-navy">Clarifications</h2>
        <ul className="mt-4 space-y-3">
          {clarifications.map((c) => (
            <li key={c.id} className="ui-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  {c.status} · {new Date(c.created_at).toLocaleString()}
                </p>
                {c.raiser && (
                  <p className="text-xs text-muted">
                    From {c.raiser.name} ({c.raiser.role})
                  </p>
                )}
              </div>
              <p className="mt-2 font-semibold text-navy">{c.question_text}</p>
              <p className="mt-1 text-sm text-muted">Reason: {c.reason}</p>
              <p className="mt-2 rounded-lg bg-canvas p-3 text-sm">{c.answer_text}</p>
              {c.resolution_notes && (
                <p className="mt-2 text-sm text-emerald-800">Resolution: {c.resolution_notes}</p>
              )}
              {canResolve && c.status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    className="ui-input max-w-md"
                    placeholder="Resolution notes"
                    value={resolveNotes[c.id] ?? ""}
                    onChange={(e) =>
                      setResolveNotes((m) => ({ ...m, [c.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary text-sm"
                    onClick={() => void resolve(c.id)}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </li>
          ))}
          {clarifications.length === 0 && (
            <li className="ui-card px-4 py-8 text-center text-sm text-muted">
              No clarification tickets.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
