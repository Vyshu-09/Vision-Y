import { Link } from "react-router-dom";
import type { ChatResponse, SourceCitation } from "../types";
import { SourceCard } from "./SourceCard";

function evidenceStrength(r: ChatResponse): "HIGH" | "MEDIUM" | "LOW" | "NONE" {
  if (!r.sources.length) return "NONE";
  if (r.needs_clarification) return "LOW";
  if (r.low_confidence || r.escalated) return "LOW";
  if (r.flagged_for_admin) return "MEDIUM";
  return "HIGH";
}

export function EvidencePanel({
  response,
  detailed,
}: {
  response: ChatResponse;
  detailed?: boolean;
}) {
  const strength = evidenceStrength(response);
  const primary: SourceCitation | undefined = response.sources[0];
  const conflict = response.escalated && response.flagged_for_admin;
  const ambiguity = response.needs_clarification;

  const queryLog = response.logs?.find((l) => l.stage === "query_analysis")?.output as
    | { domain?: string; intent?: string; normalized_query?: string; question?: string }
    | undefined;

  const searchLog = response.logs?.find((l) => l.stage === "policy_search")?.output as
    | Array<{
        title: string;
        section?: string;
        clause: string;
        page?: number | null;
        score: number;
        status?: string;
      }>
    | undefined;

  return (
    <div className="mt-4 space-y-3">
      {detailed && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-2">
            <span className="font-bold text-indigo-950 uppercase tracking-wider">🛠️ RAG Pipeline Debug Trace</span>
            <span className="text-[10px] font-semibold bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded-full">
              Developer / Admin View
            </span>
          </div>

          {queryLog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 bg-white p-2.5 rounded-lg border border-indigo-100">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">User Question:</span>
                <span className="font-medium text-slate-800">{queryLog.question}</span>
              </div>
              {queryLog.domain && (
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Detected Domain:</span>
                  <span className="font-bold text-indigo-700">{queryLog.domain}</span>
                </div>
              )}
            </div>
          )}

          {searchLog && searchLog.length > 0 && (
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1.5">
                Retrieved Chunks & Reranking Scores:
              </span>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {searchLog.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <strong className="text-slate-900">{c.title}</strong>
                      <span className="text-slate-500"> — {c.section ?? "General"} (Clause {c.clause}{c.page != null ? `, p.${c.page}` : ""})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        score: {c.score}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {c.status ?? "SELECTED"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SourceCard sources={response.sources} detailed={detailed} />

      <details className="rounded-xl border border-line bg-white open:shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>Why this answer?</span>
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Evidence</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Evidence</dt>
              <dd className="font-semibold text-navy">{strength}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Policy version</dt>
              <dd className="font-semibold text-navy">
                {primary ? (primary.status === "active" ? "VERIFIED CURRENT" : primary.status.toUpperCase()) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">As of</dt>
              <dd className="font-semibold text-navy">
                {response.as_of_date
                  ? `${response.as_of_date}${
                      response.as_of_source && response.as_of_source !== "default"
                        ? ` (${response.as_of_source})`
                        : ""
                    }`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Conflict</dt>
              <dd className="font-semibold text-navy">{conflict ? "DETECTED" : "NONE"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Ambiguity</dt>
              <dd className="font-semibold text-navy">{ambiguity ? "NEEDS CLARIFICATION" : "NONE"}</dd>
            </div>
          </dl>

          {conflict ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">
              <p className="font-semibold">Conflict detected — awaiting admin review</p>
              <p className="mt-0.5 text-xs text-orange-900/80">
                The agent found contradicting clauses. It will not pick a winner; Super Admin decides in Conflicts.
              </p>
            </div>
          ) : null}

          {primary && (
            <div className="rounded-lg bg-parchment p-3 text-navy/90">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Policy evidence</p>
              <p className="mt-1 font-semibold">{primary.policy_title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {primary.hierarchy_path || primary.section}
                {primary.page_number != null ? ` · Page ${primary.page_number}` : ""}
                {" · "}Clause {primary.clause_number}
                {" · "}v{primary.version_label ?? primary.version_year}
                {" · "}Effective {primary.effective_date}
              </p>
              <p className="mt-2 text-sm leading-relaxed">“{primary.clause_text}”</p>
              <Link
                to={`/app/policies/${primary.policy_id}`}
                className="ui-btn ui-btn-ghost mt-3 inline-flex text-xs"
              >
                View Source
              </Link>
            </div>
          )}

          {!primary && (
            <p className="text-muted">
              No authoritative university policy was found for this question. The system did not invent an
              institutional answer.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
