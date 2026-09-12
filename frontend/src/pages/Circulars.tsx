import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Circular } from "../types";

export function CircularsPage() {
  const { user } = useAuth();
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [error, setError] = useState<string | null>(null);
  const title = user?.role === "student" ? "Notices" : "Circulars";

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.circulars();
        setCirculars(data.circulars);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load circulars");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl text-navy">{title}</h1>
      <p className="mt-1 text-muted">Official circulars that may modify or clarify active policies.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-3">
        {circulars.map((c) => (
          <li key={c.id} className="ui-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-wide text-action">{c.circular_number}</p>
                <p className="mt-1 font-display text-lg text-navy">{c.title}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  c.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-navy/85">{c.description}</p>
            <p className="mt-3 text-xs text-muted">Issued {c.issued_date}</p>
          </li>
        ))}
        {circulars.length === 0 && (
          <li className="ui-card px-4 py-8 text-center text-sm text-muted">No circulars yet.</li>
        )}
      </ul>
    </div>
  );
}
