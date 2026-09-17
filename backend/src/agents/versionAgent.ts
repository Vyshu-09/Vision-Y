import type { VersionAgentInput, VersionAgentOutput, CandidateClause, AsOfSource } from "./types.js";

const HISTORICAL_RE =
  /\b(previous|prior|old|historical|last year|superseded|used to|before)\b/i;

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/**
 * Resolve as-of date from an explicit API value and/or the question text.
 * Explicit ISO date wins over parsed phrases.
 */
export function resolveAsOfDate(
  question: string,
  explicit?: string | null,
): { as_of_date: string; as_of_source: AsOfSource; date_aware: boolean } {
  const trimmed = explicit?.trim() || "";
  if (trimmed && isIsoDate(trimmed)) {
    return { as_of_date: trimmed, as_of_source: "explicit", date_aware: true };
  }

  const q = question;

  // as of / as on YYYY-MM-DD
  let m = q.match(/\b(?:as\s+of|as\s+on)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (m && isIsoDate(m[1])) {
    return { as_of_date: m[1], as_of_source: "parsed", date_aware: true };
  }

  // as of / as on 15 Jan 2025 | January 15, 2025
  m = q.match(
    /\b(?:as\s+of|as\s+on)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/i,
  );
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) {
      const d = `${m[3]}-${mon}-${pad2(Number(m[1]))}`;
      if (isIsoDate(d)) return { as_of_date: d, as_of_source: "parsed", date_aware: true };
    }
  }
  m = q.match(/\b(?:as\s+of|as\s+on)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) {
      const d = `${m[3]}-${mon}-${pad2(Number(m[2]))}`;
      if (isIsoDate(d)) return { as_of_date: d, as_of_source: "parsed", date_aware: true };
    }
  }

  // as of July 2024
  m = q.match(/\b(?:as\s+of|as\s+on)\s+([A-Za-z]+)\s+(\d{4})\b/i);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) {
      const d = `${m[2]}-${mon}-01`;
      if (isIsoDate(d)) return { as_of_date: d, as_of_source: "parsed", date_aware: true };
    }
  }

  // in 2024 / during 2024 → end of that year
  m = q.match(/\b(?:in|during)\s+(20\d{2})\b/i);
  if (m) {
    return { as_of_date: `${m[1]}-12-31`, as_of_source: "parsed", date_aware: true };
  }

  // bare year when asking about a year (e.g. "2023 attendance rule")
  m = q.match(/\b(20\d{2})\b/);
  if (m && HISTORICAL_RE.test(q)) {
    return { as_of_date: `${m[1]}-12-31`, as_of_source: "parsed", date_aware: true };
  }

  const historical = HISTORICAL_RE.test(q);
  return {
    as_of_date: todayIso(),
    as_of_source: "default",
    date_aware: historical,
  };
}

export function isEffectiveOn(c: CandidateClause, asOf: string): boolean {
  if (c.effective_date > asOf) return false;
  const until = c.effective_until;
  if (until && until.length > 0 && until < asOf) return false;
  return true;
}

function familyKey(c: CandidateClause): string {
  return c.family_id || `${c.category}::${c.policy_title}`;
}

/** Keep newest version still valid on as_of, one per policy family (or student cohort regulation for regulation families). */
export function pickVersionsForAsOf(
  candidates: CandidateClause[],
  asOf: string,
  userRegulation?: string | null,
  targetRegulation?: string | null,
): { kept: CandidateClause[]; discarded: CandidateClause[] } {
  const valid = candidates.filter((c) => isEffectiveOn(c, asOf));
  const byFamily = new Map<string, CandidateClause[]>();
  for (const c of valid) {
    const key = familyKey(c);
    const list = byFamily.get(key) ?? [];
    list.push(c);
    byFamily.set(key, list);
  }

  const kept: CandidateClause[] = [];
  const discardedIds = new Set<string>();

  for (const [famKey, list] of byFamily.entries()) {
    const isRegulationFamily =
      famKey === "BTECH_REGULATIONS" ||
      list.some((c) => c.document_type === "REGULATION" || c.source_type === "REGULATION");

    // For regulation families, check if a target or user regulation matches
    const desiredReg = (targetRegulation || userRegulation || "").toLowerCase();
    if (isRegulationFamily && desiredReg) {
      const cohortMatches = list.filter(
        (c) =>
          (c.regulation || "").toLowerCase() === desiredReg ||
          (c.version_label || "").toLowerCase() === desiredReg ||
          c.policy_title.toLowerCase().includes(desiredReg),
      );
      if (cohortMatches.length > 0) {
        const cohortPolicyIds = new Set(cohortMatches.map((c) => c.policy_id));
        for (const c of list) {
          if (cohortPolicyIds.has(c.policy_id)) kept.push(c);
          else discardedIds.add(`${c.policy_id}:${c.clause_number}`);
        }
        continue;
      }
    }

    list.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
    const bestDate = list[0].effective_date;
    // Keep all clauses from the winning policy version(s) with that effective_date
    const winners = list.filter((c) => c.effective_date === bestDate);
    const winnerPolicyIds = new Set(winners.map((c) => c.policy_id));
    for (const c of list) {
      if (winnerPolicyIds.has(c.policy_id)) kept.push(c);
      else discardedIds.add(`${c.policy_id}:${c.clause_number}`);
    }
  }

  const keptKeys = new Set(kept.map((c) => `${c.policy_id}:${c.clause_number}`));
  const discarded = candidates.filter((c) => !keptKeys.has(`${c.policy_id}:${c.clause_number}`));
  return { kept, discarded };
}

/**
 * Version Agent — date-aware selection using effective_date / effective_until.
 * Default path: active-only + cohort regulation aware. Parsed/explicit as-of (or historical keywords): filter by date.
 */
export function runVersionAgent(input: VersionAgentInput): VersionAgentOutput {
  const resolved = resolveAsOfDate(input.question, input.as_of_date);
  const historical_requested =
    HISTORICAL_RE.test(input.question) || resolved.as_of_source !== "default";

  const explicitRegMatch = input.question.match(/\b(r26|r25|r22\.1|r22|r21|r18)\b/i);
  const targetRegulation = explicitRegMatch ? explicitRegMatch[1] : null;

  // Current rules only: drop non-active, but apply cohort regulation selection
  if (!resolved.date_aware && resolved.as_of_source === "default") {
    const activeCandidates = input.candidates.filter((c) => c.status === "active");
    const { kept, discarded } = pickVersionsForAsOf(
      activeCandidates,
      resolved.as_of_date,
      input.user_regulation,
      targetRegulation,
    );
    const discardedNonActive = input.candidates.filter((c) => c.status !== "active");
    return {
      current_candidates: kept,
      discarded_superseded: [...discarded, ...discardedNonActive],
      historical_requested: false,
      as_of_date: resolved.as_of_date,
      as_of_source: resolved.as_of_source,
    };
  }

  // Historical keywords without a specific date: keep all candidates (legacy behavior)
  if (resolved.as_of_source === "default" && HISTORICAL_RE.test(input.question)) {
    return {
      current_candidates: input.candidates,
      discarded_superseded: [],
      historical_requested: true,
      as_of_date: resolved.as_of_date,
      as_of_source: resolved.as_of_source,
    };
  }

  const { kept, discarded } = pickVersionsForAsOf(
    input.candidates,
    resolved.as_of_date,
    input.user_regulation,
    targetRegulation,
  );
  return {
    current_candidates: kept,
    discarded_superseded: discarded,
    historical_requested,
    as_of_date: resolved.as_of_date,
    as_of_source: resolved.as_of_source,
  };
}
