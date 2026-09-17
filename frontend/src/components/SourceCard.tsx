import { useState } from "react";
import type { SourceCitation } from "../types";

export function SourceCard({ sources }: { sources: SourceCitation[]; detailed?: boolean }) {
  const [expandedClauseIndex, setExpandedClauseIndex] = useState<number | null>(null);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {sources.map((s, idx) => {
        const isExpanded = expandedClauseIndex === idx;
        return (
          <div
            key={`${s.policy_id}-${s.clause_number}-${idx}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">📄</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Verification</span>
              </div>
              {s.source_type && (
                <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  {s.source_type === "OFFICIAL_VIGNAN" ? "OFFICIAL VIGNAN" : s.source_type.replace("_", " ")}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <div className="flex items-baseline gap-2">
                <span className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-400">Policy:</span>
                <span className="font-semibold text-slate-900">{s.policy_title}</span>
              </div>

              {s.section && (
                <div className="flex items-baseline gap-2">
                  <span className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-400">Section:</span>
                  <span className="font-medium text-slate-800">{s.section}</span>
                </div>
              )}

              {s.clause_number && (
                <div className="flex items-baseline gap-2">
                  <span className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-400">Clause:</span>
                  <span className="font-medium text-slate-800">{s.clause_number}</span>
                </div>
              )}

              {s.page_number != null && (
                <div className="flex items-baseline gap-2">
                  <span className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-400">Page:</span>
                  <span className="font-medium text-slate-800">{s.page_number}</span>
                </div>
              )}

              {s.source_url && (
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-400">Official URL:</span>
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs font-medium text-blue-600 hover:underline"
                  >
                    {s.source_url} ↗
                  </a>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExpandedClauseIndex(isExpanded ? null : idx)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <span>{isExpanded ? "▲ Hide Relevant Clause" : "🔍 View Relevant Clause"}</span>
              </button>
              <span className="text-[11px] text-slate-400">
                {s.regulation ? `Reg: ${s.regulation}` : s.effective_date ? `Eff: ${s.effective_date}` : ""}
              </span>
            </div>

            {isExpanded && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800 border border-slate-200 animate-fadeIn">
                <p className="font-semibold text-slate-600 mb-1 text-[11px] uppercase tracking-wider">
                  Retrieved Official Clause Excerpt:
                </p>
                <p className="whitespace-pre-wrap font-sans text-slate-800">{s.clause_text}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
