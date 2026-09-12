import type { AuthorityLevel } from "../types.js";
import type { CandidateClause, GovernanceAgentInput, GovernanceAgentOutput } from "./types.js";

const OVERRIDE_RE = /\b(notwithstanding|overrides?|shall prevail|in case of conflict)\b/i;

const AUTHORITY_RANK: Record<AuthorityLevel, number> = {
  university: 2,
  department: 1,
};

function questionFit(clause: CandidateClause, question: string): number {
  const q = question.toLowerCase();
  let score = clause.similarity_score;
  if (clause.department && q.includes(clause.department.toLowerCase())) score += 0.15;
  if (/\blab/.test(q) && /\blab/.test(clause.clause_text.toLowerCase())) score += 0.15;
  if (/condon/.test(q) && /condon/.test(clause.clause_text.toLowerCase())) score += 0.25;
  return score;
}

function pickByPrecedence(involved: CandidateClause[]): {
  winner: CandidateClause | null;
  rationale: string;
  tied: boolean;
} {
  if (involved.length === 0) {
    return { winner: null, rationale: "No clauses in conflict set.", tied: true };
  }

  const withOverride = involved.filter((c) => OVERRIDE_RE.test(c.clause_text));
  if (withOverride.length === 1) {
    return {
      winner: withOverride[0],
      rationale: `Explicit override language in clause ${withOverride[0].clause_number} of ${withOverride[0].policy_title}.`,
      tied: false,
    };
  }

  const byAuthority = [...involved].sort(
    (a, b) => AUTHORITY_RANK[b.authority_level] - AUTHORITY_RANK[a.authority_level],
  );
  const topRank = AUTHORITY_RANK[byAuthority[0].authority_level];
  const topAuthority = byAuthority.filter((c) => AUTHORITY_RANK[c.authority_level] === topRank);

  if (topAuthority.length === 1) {
    return {
      winner: topAuthority[0],
      rationale: `Higher authority (${topAuthority[0].authority_level}) prevails: ${topAuthority[0].policy_title} clause ${topAuthority[0].clause_number}.`,
      tied: false,
    };
  }

  const byDate = [...topAuthority].sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  if (byDate[0].effective_date !== byDate[1]?.effective_date) {
    return {
      winner: byDate[0],
      rationale: `Same authority level; newer effective date ${byDate[0].effective_date} selected (${byDate[0].policy_title}).`,
      tied: false,
    };
  }

  return {
    winner: null,
    rationale:
      "Conflicting clauses share the same authority level and effective date; Super Admin clarification is required.",
    tied: true,
  };
}

/**
 * Governance / Authority Agent
 * University > Department; then newer effective date; else escalate.
 */
export function runGovernanceAgent(input: GovernanceAgentInput): GovernanceAgentOutput {
  const { current_candidates, conflicting_pairs, question } = input;

  if (current_candidates.length === 0) {
    return {
      applicable_clause: null,
      escalated: true,
      rationale:
        "No matching active policy clauses were found for this question — Agent 53 will not invent an answer.",
    };
  }

  const ranked = [...current_candidates].sort((a, b) => questionFit(b, question) - questionFit(a, question));
  const best = ranked[0];

  if (conflicting_pairs.length === 0) {
    return {
      applicable_clause: best,
      escalated: false,
      rationale: "No conflicts detected; selected the best-fitting active clause.",
    };
  }

  const involvedKeys = new Set<string>();
  for (const pair of conflicting_pairs) {
    involvedKeys.add(`${pair.a.policy_id}:${pair.a.clause_number}`);
    involvedKeys.add(`${pair.b.policy_id}:${pair.b.clause_number}`);
  }

  const bestKey = `${best.policy_id}:${best.clause_number}`;
  if (!involvedKeys.has(bestKey)) {
    return {
      applicable_clause: best,
      escalated: false,
      rationale:
        "A conflict exists elsewhere, but the clause that answers this question is not part of that conflict.",
    };
  }

  const relatedPairs = conflicting_pairs.filter(
    (p) =>
      `${p.a.policy_id}:${p.a.clause_number}` === bestKey ||
      `${p.b.policy_id}:${p.b.clause_number}` === bestKey,
  );
  const involved: CandidateClause[] = [];
  const seen = new Set<string>();
  for (const pair of relatedPairs) {
    for (const c of [pair.a, pair.b]) {
      const k = `${c.policy_id}:${c.clause_number}`;
      if (!seen.has(k)) {
        seen.add(k);
        involved.push(c);
      }
    }
  }

  const { winner, rationale, tied } = pickByPrecedence(involved);
  if (tied || !winner) {
    return {
      applicable_clause: null,
      escalated: true,
      rationale,
    };
  }

  return {
    applicable_clause: winner,
    escalated: false,
    rationale,
  };
}
