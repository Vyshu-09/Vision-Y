import { useState } from "react";
import type { SourceCitation } from "../types";

export function SourceCard({ sources, detailed }: { sources: SourceCitation[]; detailed?: boolean }) {
  const [open, setOpen] = useState(true);
  if (sources.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gold/60 bg-parchment px-4 py-3 text-sm text-muted">
        No source clause was attached to this answer.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border-2 border-gold bg-parchment">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-gold/15 px-4 py-3 text-left"
      >
        <span className="font-display text-base text-navy">✓ Source &amp; Clause</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div className="space-y-4 px-4 py-4">
          {sources.map((s) => (
            <article
              key={`${s.policy_id}-${s.clause_number}`}
              className="border-t border-gold/30 pt-3 first:border-t-0 first:pt-0"
            >
              <p className="font-display text-lg leading-snug text-navy">{s.policy_title}</p>
              {s.section && (
                <p className="mt-1 text-sm font-medium text-navy/80">
                  Section: {s.section}
                  {s.page_number != null ? ` · Page ${s.page_number}` : ""}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Clause</dt>
                  <dd className="font-semibold">{s.clause_number}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Version</dt>
                  <dd className="font-semibold">{s.version_year}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Effective</dt>
                  <dd className="font-semibold">{s.effective_date}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Authority</dt>
                  <dd className="font-semibold capitalize">{s.authority_level}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Status</dt>
                  <dd className="font-semibold uppercase">
                    {s.status === "active" ? "CURRENT" : s.status.replace("_", " ")}
                  </dd>
                </div>
              </dl>
              {detailed !== false && (
                <p className="mt-3 rounded-lg bg-white/80 p-3 text-sm leading-relaxed text-navy/90">
                  {s.clause_text}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
