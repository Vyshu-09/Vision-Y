import type { CandidateClause, ConflictAgentInput, ConflictAgentOutput, ConflictingPair } from "./types.js";

const ATTENDANCE_PCT_RE =
  /(?:minimum\s+(?:of\s+)?|maintain\s+a\s+minimum\s+of\s+|require[sd]?\s+(?:a\s+)?(?:minimum\s+(?:of\s+)?)?|at\s+least\s+)(\d{1,3})\s*%\s+attendance|attendance[^\n.]{0,40}?(?:minimum|at\s+least|of)\s+(\d{1,3})\s*%|(\d{1,3})\s*%\s+attendance/i;

const FEE_RE = /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*)/gi;

function attendanceMinimum(text: string): string | null {
  // Ignore pure condonation fee clauses without a competing minimum
  if (/\bcondonation fee\b/i.test(text) && !/\d{1,3}\s*%/.test(text)) return null;
  const m = text.match(ATTENDANCE_PCT_RE);
  if (!m) return null;
  const pct = m[1] || m[2] || m[3];
  return pct ? `${pct}%` : null;
}

function feeAmounts(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(FEE_RE)) found.add(`₹${m[1].replace(/,/g, "")}`);
  return [...found];
}

function sameTopic(a: CandidateClause, b: CandidateClause): boolean {
  if (a.category.toLowerCase() === b.category.toLowerCase()) return true;
  const tokens = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
  const A = tokens(`${a.clause_text} ${a.section}`);
  const B = tokens(`${b.clause_text} ${b.section}`);
  let overlap = 0;
  for (const t of A) if (B.has(t)) overlap++;
  const denom = Math.min(A.size, B.size) || 1;
  return overlap / denom >= 0.22;
}

/**
 * Conflict Agent — detects same-rule numeric mismatches (does not pick a winner).
 */
export function runConflictAgent(input: ConflictAgentInput): ConflictAgentOutput {
  const pairs: ConflictingPair[] = [];
  const list = input.current_candidates;

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.policy_id === b.policy_id) continue;
      if (!sameTopic(a, b)) continue;

      const attA = attendanceMinimum(a.clause_text);
      const attB = attendanceMinimum(b.clause_text);
      if (attA && attB && attA !== attB) {
        pairs.push({
          a,
          b,
          description: `Attendance minimum mismatch on ${a.category}: ${a.policy_title} ${a.clause_number} requires ${attA} while ${b.policy_title} ${b.clause_number} requires ${attB}.`,
        });
        continue;
      }

      const feeTopic =
        /\b(fee|fine|condonation fee|revaluation)\b/i.test(a.clause_text) &&
        /\b(fee|fine|condonation fee|revaluation)\b/i.test(b.clause_text);
      if (feeTopic) {
        const feesA = feeAmounts(a.clause_text);
        const feesB = feeAmounts(b.clause_text);
        const onlyA = feesA.filter((n) => !feesB.includes(n));
        const onlyB = feesB.filter((n) => !feesA.includes(n));
        if (onlyA.length && onlyB.length) {
          pairs.push({
            a,
            b,
            description: `Fee amount mismatch: ${a.policy_title} ${a.clause_number} cites ${onlyA.join(", ")} while ${b.policy_title} ${b.clause_number} cites ${onlyB.join(", ")}.`,
          });
        }
      }
    }
  }

  return { conflict: pairs.length > 0, conflicting_pairs: pairs };
}
