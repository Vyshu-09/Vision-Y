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
  const qLower = question.toLowerCase();
  let hits = 0;
  for (const t of q) {
    if (blob.includes(t)) hits += 1;
  }
  let boost = hits / q.length;

  // 1. Refund & Admission Cancellation
  if (/\b(refund|cancel|cancellation)\b/.test(qLower)) {
    if (/\b(refund|cancel|cancellation)\b/.test(blob)) {
      boost += 0.45;
    }
    if (/\bfee fixation\b/.test(blob)) {
      boost -= 0.25;
    }
  }

  // 2. Scholarships & Concessions
  if (/\b(scholarship|scholarships|merit\s+award|fee\s+concession)\b/.test(qLower)) {
    if (/\b(scholarship|scholarships)\b/.test(title.toLowerCase()) || /\b(scholarship|concession)\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 3. Revaluation & Examination Fees
  if (/\b(revaluation|re-evaluation|verification|exam\s+fee|answer\s+script)\b/.test(qLower)) {
    if (/\b(revaluation|verification|examination|exam)\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 4. Grievance Redressal
  if (/\b(grievance|complaint|redressal|harassment)\b/.test(qLower)) {
    if (/\bgrievance\b/.test(title.toLowerCase()) || /\b(grievance|complaint)\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 5. Research & Seed Money
  if (/\b(research|seed\s+money|journal|publication|scopus)\b/.test(qLower)) {
    if (/\bresearch\b/.test(title.toLowerCase()) || /\b(research|seed money)\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 6. Consultancy
  if (/\b(consultancy|industry\s+project)\b/.test(qLower)) {
    if (/\bconsultancy\b/.test(title.toLowerCase()) || /\bconsultancy\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 7. Industrial Training & Internships
  if (/\b(industrial\s+training|internship|internships)\b/.test(qLower)) {
    if (/\bindustrial\s+training\b/.test(title.toLowerCase()) || /\b(industrial training|internship)\b/.test(blob)) {
      boost += 0.45;
    }
  }

  // 8. Attendance & Condonation
  if (/\bminimum\b/.test(qLower) && /\battendance\b/.test(qLower)) {
    if (/minimum\s+(?:of\s+)?\d{1,3}\s*%\s+attendance|maintain\s+a\s+minimum\s+of\s+\d{1,3}\s*%/i.test(clauseText)) {
      boost += 0.35;
    }
    if (/\bcondon/i.test(clauseText) && !/minimum\s+(?:of\s+)?\d{1,3}\s*%/i.test(clauseText)) {
      boost -= 0.2;
    }
  }

  // 9. Hostel entry / return timings
  if (/\bhostel\b/.test(qLower) && /\b(entry|timing|return|curfew|in\s*time)\b/.test(qLower)) {
    if (/\bhostel\b/i.test(blob) && /\b(return|9:00|10:00|warden|weekday|weekend)\b/i.test(clauseText)) {
      boost += 0.35;
    }
  }

  return boost;
}

function regulationBoost(
  question: string,
  clause: { regulation?: string | null; program?: string | null; policy_title?: string },
  userRegulation?: string | null,
  userProgram?: string | null,
): number {
  let boost = 0;
  const q = question.toLowerCase();
  const regInDoc = (clause.regulation || "").toLowerCase();
  const title = (clause.policy_title || "").toLowerCase();

  // Check if query explicitly asks for a regulation (e.g., "R26", "R25", "R22", "R22.1")
  const explicitRegMatch = q.match(/\b(r26|r25|r22\.1|r22|r21|r18)\b/i);
  if (explicitRegMatch) {
    const explicitTarget = explicitRegMatch[1].toLowerCase();
    if (regInDoc === explicitTarget || title.includes(explicitTarget)) {
      return 0.45;
    }
    // Penalize other regulations if a specific one was explicitly asked
    if (regInDoc && regInDoc !== explicitTarget) {
      return -0.25;
    }
  }

  // If user has a registered cohort regulation (e.g., student admitted under R22)
  if (userRegulation) {
    const userRegNorm = userRegulation.toLowerCase();
    if (regInDoc === userRegNorm || title.includes(userRegNorm)) {
      boost += 0.35;
    } else if (regInDoc && regInDoc !== userRegNorm) {
      // Deprecate other regulations when answering cohort questions
      boost -= 0.15;
    }
  }

  // Program match (e.g., B.Tech)
  if (userProgram && clause.program) {
    if (userProgram.toLowerCase() === clause.program.toLowerCase()) {
      boost += 0.1;
    }
  }

  return boost;
}

/**
 * Policy Search Agent — role-filtered retrieval over authoritative official Vignan documents only.
 * Mock/demo documents are strictly excluded from retrieval.
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

      // STRICT GUARD: Never retrieve mock or demo_only documents for answers
      if (
        policy.status === "demo_only" ||
        policy.source_type === "MOCK_DEMO" ||
        (policy.source_file_url ?? "").startsWith("seed://")
      ) {
        return null;
      }

      // Role check: super_admin can see all, otherwise check audience
      if (!policy.audience.includes(input.role) && input.role !== "super_admin") return null;

      const semantic = cosineSimilarity(queryVec, clause.embedding_vector);
      const lexical = lexicalBoost(input.question, clause.clause_text, clause.section, policy.title);
      const regBoost = regulationBoost(
        input.question,
        {
          regulation: clause.regulation ?? policy.regulation,
          program: clause.program ?? policy.program,
          policy_title: policy.title,
        },
        input.user_regulation,
        input.user_program,
      );

      const score = semantic * 0.50 + lexical * 0.35 + regBoost;
      return toCandidate(policy, clause, score);
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .filter((c) => c.similarity_score >= 0.18)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topK);

  return { candidates: scored };
}
