import type { VersionAgentInput, VersionAgentOutput } from "./types.js";

const HISTORICAL_RE =
  /\b(previous|prior|old|historical|last year|20\d{2}|superseded|used to|before)\b/i;

/**
 * Version Agent
 * Input:  candidate clauses (may span multiple years/versions)
 * Output: { current_candidates, discarded_superseded, historical_requested }
 *
 * Keeps only the active version per category unless the user asks about historical rules.
 * TODO: add explicit "as of <date>" interpretation once query parsing is richer.
 */
export function runVersionAgent(input: VersionAgentInput): VersionAgentOutput {
  const historical_requested = HISTORICAL_RE.test(input.question);

  if (historical_requested) {
    return {
      current_candidates: input.candidates,
      discarded_superseded: [],
      historical_requested: true,
    };
  }

  const current_candidates = input.candidates.filter((c) => c.status === "active");
  const discarded_superseded = input.candidates.filter((c) => c.status !== "active");

  return { current_candidates, discarded_superseded, historical_requested: false };
}
