import type { Circular, Policy } from "../types.js";
import { store } from "../db/store.js";

export interface RelatedCircular {
  id: string;
  title: string;
  circular_number: string;
  issued_date: string;
  description: string;
  modifies_policy_id: string | null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/%.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Score how relevant a circular is to the question. */
export function circularRelevance(circular: Circular, question: string): number {
  const qTokens = new Set(tokenize(question));
  const blob = tokenize(`${circular.title} ${circular.circular_number} ${circular.description}`);
  if (!blob.length || !qTokens.size) return 0;
  let hits = 0;
  for (const t of blob) if (qTokens.has(t)) hits += 1;
  // Boost common policy keywords
  const q = question.toLowerCase();
  if (/condon|fee|attendance/.test(q) && /condon|fee|attendance/.test(circular.description.toLowerCase())) {
    hits += 3;
  }
  if (/exam|registration/.test(q) && /exam|registration/.test(`${circular.title} ${circular.description}`.toLowerCase())) {
    hits += 3;
  }
  if (/circular|cir\//.test(q) && circular.circular_number) hits += 2;
  return hits / Math.max(blob.length, 1) + hits * 0.05;
}

/**
 * Circulars that modify a policy, plus any active circulars that strongly match the question.
 */
export function findRelatedCirculars(policyId: string | null, question: string, limit = 3): RelatedCircular[] {
  const active = store.listCirculars().filter((c) => c.status === "active");
  const scored = active
    .map((c) => {
      let score = circularRelevance(c, question);
      if (policyId && c.modifies_policy_id === policyId) score += 0.5;
      return { c, score };
    })
    .filter((x) => x.score > 0.08 || (policyId && x.c.modifies_policy_id === policyId))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ c }) => ({
    id: c.id,
    title: c.title,
    circular_number: c.circular_number,
    issued_date: c.issued_date,
    description: c.description,
    modifies_policy_id: c.modifies_policy_id,
  }));
}

export function formatCircularContext(circulars: RelatedCircular[], policy?: Policy | null): string {
  if (!circulars.length) return "";
  return circulars
    .map((c) => {
      const link = policy && c.modifies_policy_id === policy.id ? ` (modifies ${policy.title})` : "";
      return `- ${c.circular_number} (${c.issued_date}): ${c.title}${link}\n  ${c.description}`;
    })
    .join("\n");
}
