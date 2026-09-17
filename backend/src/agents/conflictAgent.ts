import type { CandidateClause, ConflictAgentInput, ConflictAgentOutput, ConflictingPair } from "./types.js";

const ATTENDANCE_PCT_RE =
  /(?:minimum\s+(?:of\s+)?|maintain\s+a\s+minimum\s+of\s+|require[sd]?\s+(?:a\s+)?(?:minimum\s+(?:of\s+)?)?|at\s+least\s+)(\d{1,3})\s*%\s+attendance|attendance[^\n.]{0,40}?(?:minimum|at\s+least|of)\s+(\d{1,3})\s*%|(\d{1,3})\s*%\s+attendance/i;

const FEE_RE = /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*)/gi;

const CLOCK_RE = /\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi;

const DAY_COUNT_RE =
  /\b(\d{1,3})\s*(?:calendar\s+)?(?:working\s+)?days?\b|\b(?:maximum|minimum|upto|up\s+to|not\s+more\s+than|within)\s+(\d{1,3})\s*(?:calendar\s+)?(?:working\s+)?days?\b/gi;

function attendanceMinimum(text: string): string | null {
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

function normalizeClock(raw: string): string | null {
  const m = raw.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const ampm = (m[3] || "").toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (!ampm && h <= 12 && /\b(return|entry|curfew|hostel|in\s*time)\b/i.test(raw)) {
    // bare hour in hostel context often evening; leave as-is if already 24h-ish
  }
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** Extract return/entry times from hostel-related clauses. */
function hostelClocks(text: string): string[] {
  if (!/\b(hostel|return|entry|curfew|in[\s-]?time|out[\s-]?time|weekday|weekend)\b/i.test(text)) {
    return [];
  }
  const found = new Set<string>();
  for (const m of text.matchAll(CLOCK_RE)) {
    const clock = normalizeClock(m[0]);
    if (clock) found.add(clock);
  }
  return [...found].sort();
}

function dayCounts(text: string): string[] {
  if (!/\b(leave|days?|period|duration|absent|absence)\b/i.test(text)) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(DAY_COUNT_RE)) {
    const n = m[1] || m[2];
    if (n) found.add(`${n} days`);
  }
  return [...found];
}

type Polarity = "positive" | "negative" | null;

function polarity(text: string): Polarity {
  const neg = /\b(shall\s+not|must\s+not|may\s+not|cannot|can\s+not|not\s+permitted|not\s+allowed|prohibited|forbidden)\b/i.test(
    text,
  );
  const pos = /\b(shall|must|may|permitted|allowed|required)\b/i.test(text);
  if (neg) return "negative";
  if (pos) return "positive";
  return null;
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
 * Conflict Agent — detects same-rule mismatches (does not pick a winner).
 */
export function runConflictAgent(input: ConflictAgentInput): ConflictAgentOutput {
  const pairs: ConflictingPair[] = [];
  const list = input.current_candidates;
  const seen = new Set<string>();

  function push(pair: ConflictingPair) {
    const key = [pair.a.policy_id, pair.a.clause_number, pair.b.policy_id, pair.b.clause_number]
      .sort()
      .join("|");
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(pair);
  }

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.policy_id === b.policy_id) continue;
      if (!sameTopic(a, b)) continue;

      const attA = attendanceMinimum(a.clause_text);
      const attB = attendanceMinimum(b.clause_text);
      if (attA && attB && attA !== attB) {
        push({
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
          push({
            a,
            b,
            description: `Fee amount mismatch: ${a.policy_title} ${a.clause_number} cites ${onlyA.join(", ")} while ${b.policy_title} ${b.clause_number} cites ${onlyB.join(", ")}.`,
          });
          continue;
        }
      }

      const clocksA = hostelClocks(a.clause_text);
      const clocksB = hostelClocks(b.clause_text);
      if (clocksA.length && clocksB.length) {
        const onlyA = clocksA.filter((t) => !clocksB.includes(t));
        const onlyB = clocksB.filter((t) => !clocksA.includes(t));
        if (onlyA.length && onlyB.length) {
          push({
            a,
            b,
            description: `Hostel timing mismatch: ${a.policy_title} ${a.clause_number} cites ${clocksA.join(", ")} while ${b.policy_title} ${b.clause_number} cites ${clocksB.join(", ")}.`,
          });
          continue;
        }
      }

      const daysA = dayCounts(a.clause_text);
      const daysB = dayCounts(b.clause_text);
      if (daysA.length && daysB.length) {
        const onlyA = daysA.filter((d) => !daysB.includes(d));
        const onlyB = daysB.filter((d) => !daysA.includes(d));
        if (onlyA.length && onlyB.length) {
          push({
            a,
            b,
            description: `Day-count mismatch: ${a.policy_title} ${a.clause_number} cites ${daysA.join(", ")} while ${b.policy_title} ${b.clause_number} cites ${daysB.join(", ")}.`,
          });
          continue;
        }
      }

      const polA = polarity(a.clause_text);
      const polB = polarity(b.clause_text);
      if (polA && polB && polA !== polB) {
        push({
          a,
          b,
          description: `Polarity clash on ${a.category}: ${a.policy_title} ${a.clause_number} is ${polA} while ${b.policy_title} ${b.clause_number} is ${polB}.`,
        });
      }
    }
  }

  return { conflict: pairs.length > 0, conflicting_pairs: pairs };
}
