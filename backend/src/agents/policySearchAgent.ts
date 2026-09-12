import { cosineSimilarity, embedText } from "../embeddings/embedder.js";
import { store } from "../db/store.js";
import { toCandidate, type PolicySearchInput, type PolicySearchOutput } from "./types.js";

export interface PolicySearchDeps {
  embed?: (text: string) => number[];
  listClauses?: () => ReturnType<typeof store.allClauses>;
  getPolicy?: (id: string) => ReturnType<typeof store.getPolicy>;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "what",
  "is",
  "are",
  "can",
  "i",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "my",
  "me",
  "do",
  "does",
  "how",
  "with",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function lexicalBoost(question: string, clauseText: string, section: string, title: string): number {
  const q = tokens(question);
  if (!q.length) return 0;
  const blob = `${clauseText} ${section} ${title}`.toLowerCase();
  let hits = 0;
  for (const t of q) {
    if (blob.includes(t)) hits += 1;
  }
  let boost = hits / q.length;

  // Prefer the actual minimum-attendance rule over condonation side-rules
  if (/\bminimum\b/.test(question.toLowerCase()) && /\battendance\b/.test(question.toLowerCase())) {
    if (/minimum\s+(?:of\s+)?\d{1,3}\s*%\s+attendance|maintain\s+a\s+minimum\s+of\s+\d{1,3}\s*%/i.test(clauseText)) {
      boost += 0.35;
    }
    if (/\bcondon/i.test(clauseText) && !/minimum\s+(?:of\s+)?\d{1,3}\s*%/i.test(clauseText)) {
      boost -= 0.2;
    }
  }
  return boost;
}

/**
 * Policy Search Agent — role-filtered retrieval over official clauses only.
 */
export function runPolicySearchAgent(
  input: PolicySearchInput,
  deps: PolicySearchDeps = {},
): PolicySearchOutput {
  const embed = deps.embed ?? embedText;
  const listClauses = deps.listClauses ?? (() => store.allClauses());
  const getPolicy = deps.getPolicy ?? ((id: string) => store.getPolicy(id));
  const topK = input.topK ?? 8;

  const queryVec = embed(input.question);
  const scored = listClauses()
    .map((clause) => {
      const policy = getPolicy(clause.policy_id);
      if (!policy) return null;
      if (!policy.audience.includes(input.role) && input.role !== "super_admin") return null;
      const semantic = cosineSimilarity(queryVec, clause.embedding_vector);
      const lexical = lexicalBoost(input.question, clause.clause_text, clause.section, policy.title);
      const score = semantic * 0.55 + lexical * 0.45;
      return toCandidate(policy, clause, score);
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .filter((c) => c.similarity_score >= 0.18)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topK);

  return { candidates: scored };
}
