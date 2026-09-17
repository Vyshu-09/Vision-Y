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

  return (
    <div className="mt-4 space-y-3">
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
