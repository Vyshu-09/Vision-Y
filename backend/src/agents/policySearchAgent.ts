import { cosineSimilarity, embedText } from "../embeddings/embedder.js";
import { store } from "../db/store.js";
import { toCandidate, type CandidateClause, type PolicySearchInput, type PolicySearchOutput } from "./types.js";

export interface PolicySearchDeps {
  embed?: (text: string) => number[];
  listClauses?: () => ReturnType<typeof store.allClauses>;
  getPolicy?: (id: string) => ReturnType<typeof store.getPolicy>;
}

export type PolicyDomain =
  | "SCHOLARSHIP"
  | "ADMISSION_REFUND"
  | "ATTENDANCE_REGULATION"
  | "EXAMINATION"
  | "LEAVE"
  | "CONDUCT"
  | "RESEARCH"
  | "CONSULTANCY"
  | "TRAINING"
  | "HOSTEL"
  | "GRIEVANCE"
  | "IT"
  | "GENERAL";

export type QueryIntentType =
  | "MINIMUM_ELIGIBILITY"
  | "AMOUNT_CONCESSION"
  | "WHO_CAN_APPLY"
  | "CONTINUATION_RULES"
  | "PROCEDURE_APPLY"
  | "GENERAL_RULES";

export interface QueryAnalysis {
  domain: PolicyDomain;
  intent: QueryIntentType;
  subEntity: string | null;
  normalizedQuery: string;
  keywords: string[];
}

const STOP_WORDS = new Set([
  "the", "and", "for", "what", "is", "are", "can", "i", "a", "an", "of", "to",
  "in", "on", "my", "me", "do", "does", "how", "with", "about", "get", "give", "given", "tell"
]);

/**
 * Normalizes spelling mistakes commonly typed by users.
 */
export function normalizeSpelling(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b(scholrship|scholarhips|scholarhip|scholership|scholaship|scholorship)\b/gi, "scholarship")
    .replace(/\b(scholrships|scholarhipss|scholerships|scholaships)\b/gi, "scholarships")
    .replace(/\b(bavklog|bavklogs|bcklog|bcklogs|backlogs|arrear|arrears)\b/gi, "backlog")
    .replace(/\b(attendence|attandance|atendance|atendence)\b/gi, "attendance")
    .replace(/\b(faculity|facuty|faclty)\b/gi, "faculty")
    .replace(/\b(leavee|leavs|laeve)\b/gi, "leave")
    .replace(/\b(percantage|percentge|persentage|percntage)\b/gi, "percentage")
    .replace(/\b(requried|requierd|requird|requred)\b/gi, "required")
    .replace(/\b(minmum|minumum|minimun)\b/gi, "minimum")
    .replace(/\b(elgibility|eligiblity|elegibility|eligable)\b/gi, "eligibility")
    .replace(/\b(grivance|grievence|grievenc)\b/gi, "grievance")
    .replace(/\b(revalution|reevaluation)\b/gi, "revaluation")
    .replace(/\b(admision|addmission|admisison)\b/gi, "admission")
    .replace(/\b(cancilation|cancellaton|cancelation)\b/gi, "cancellation")
    .replace(/\b(consultncy|consultensy)\b/gi, "consultancy")
    .replace(/\b(reseach|reserch)\b/gi, "research");
}

export function extractTokens(text: string): string[] {
  return normalizeSpelling(text)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Domain-first NLP Query Analysis & Normalization
 */
export function analyzeQuery(question: string): QueryAnalysis {
  const corrected = normalizeSpelling(question);
  const q = corrected.toLowerCase().trim();
  const rawTokens = extractTokens(q);

  let domain: PolicyDomain = "GENERAL";
  let intent: QueryIntentType = "GENERAL_RULES";
  let subEntity: string | null = null;
  let normalizedQuery = corrected;

  // 1. Policy Domain Detection
  if (/\b(scholarship|scholarships|stipend|htra|fee concession|merit award)\b/i.test(q)) {
    domain = "SCHOLARSHIP";
  } else if (/\b(refund|cancellation|cancel admission|admission cancellation|tuition refund)\b/i.test(q)) {
    domain = "ADMISSION_REFUND";
  } else if (/\b(attendance|condon|condonation|detention|detained|attendance shortage)\b/i.test(q)) {
    domain = "ATTENDANCE_REGULATION";
  } else if (/\b(revaluation|re-evaluation|script verification|exam fee|answer script)\b/i.test(q)) {
    domain = "EXAMINATION";
  } else if (/\b(faculty leave|leave rule|leave rules|casual leave|od leave|on duty|maternity|paternity|probation leave)\b/i.test(q) || (/\bleave\b/i.test(q) && /\b(faculty|employee|staff|probation|casual|cl|maternity|paternity|od)\b/i.test(q))) {
    domain = "LEAVE";
  } else if (/\b(code of conduct|ragging|discipline|harassment|anti-ragging)\b/i.test(q)) {
    domain = "CONDUCT";
  } else if (/\b(research policy|seed money|scopus|sci journal|patent|plagiarism)\b/i.test(q)) {
    domain = "RESEARCH";
  } else if (/\b(consultancy|technical advisory|revenue share|testing revenue)\b/i.test(q)) {
    domain = "CONSULTANCY";
  } else if (/\b(industrial training|internship|internships)\b/i.test(q)) {
    domain = "TRAINING";
  } else if (/\b(hostel|hostel timings|curfew|warden|in-time|out-time)\b/i.test(q)) {
    domain = "HOSTEL";
  } else if (/\b(grievance|complaint|redressal|petition)\b/i.test(q)) {
    domain = "GRIEVANCE";
  } else if (/\b(it policy|wi-fi|wifi|cybersecurity|software license)\b/i.test(q)) {
    domain = "IT";
  } else if (/\b(regulation|regulations|r26|r25|r22|r22\.1|b\.tech regulation)\b/i.test(q)) {
    domain = "ATTENDANCE_REGULATION";
  }

  // 2. Sub-entity extraction
  if (/\b(backlog|backlogs|bavklog|bavklogs|arrear|arrears|failed|fail|fails)\b/i.test(q)) subEntity = "backlog";
  else if (/\b(sibling|brother|sister)\b/i.test(q)) subEntity = "sibling";
  else if (/\b(cap|armed personnel|defence|army)\b/i.test(q)) subEntity = "cap";
  else if (/\b(sport|sports quota|athletics)\b/i.test(q)) subEntity = "sports";
  else if (/\b(sc\s*\/\s*st|sc|st)\b/i.test(q)) subEntity = "sc_st";
  else if (/\b(alumni)\b/i.test(q)) subEntity = "alumni";
  else if (/\b(staff|employee ward)\b/i.test(q)) subEntity = "staff";
  else if (/\b(casual leave|cl\b)\b/i.test(q)) subEntity = "casual_leave";
  else if (/\b(probation|probationary)\b/i.test(q)) subEntity = "probation";
  else if (/\b(maternity|pregnancy)\b/i.test(q)) subEntity = "maternity";
  else if (/\b(paternity)\b/i.test(q)) subEntity = "paternity";
  else if (/\b(od\b|on duty|on-duty|academic leave)\b/i.test(q)) subEntity = "od_leave";
  else if (/\b(phd|research scholar)\b/i.test(q)) subEntity = "phd";

  // 3. Intent Detection
  if (/\b(minimum|score|percentage|marks|cgpa|gpa|cutoff|threshold|needed|required|how many)\b/i.test(q)) {
    intent = "MINIMUM_ELIGIBILITY";
  } else if (/\b(how much|amount|concession|discount|share|ratio|percent)\b/i.test(q)) {
    intent = "AMOUNT_CONCESSION";
  } else if (/\b(who can|who is|eligible|eligibility|can i apply|apply|can faculty|can students|does students|do students)\b/i.test(q)) {
    intent = "WHO_CAN_APPLY";
  } else if (/\b(condition|conditions|criteria|maintain|continue|continuation|subsequent years|backlog)\b/i.test(q)) {
    intent = "CONTINUATION_RULES";
  } else if (/\b(procedure|process|where to|how to|documents|form)\b/i.test(q)) {
    intent = "PROCEDURE_APPLY";
  }

  // 4. Query Normalization & Synonym Expansion
  if (domain === "SCHOLARSHIP") {
    if (subEntity === "backlog" || q.includes("backlog")) {
      normalizedQuery = "Vignan University Scholarships Policy continuation of scholarships in subsequent years 70% passed in first attempt without any backlogs eligibility rules";
      intent = "CONTINUATION_RULES";
      subEntity = "backlog";
    } else if (intent === "MINIMUM_ELIGIBILITY" || intent === "CONTINUATION_RULES") {
      normalizedQuery = "Vignan University Scholarships Policy minimum percentage score CGPA eligibility academic requirement 70% continuation criteria without backlogs";
    } else if (subEntity === "sibling") {
      normalizedQuery = "Vignan University Scholarships Policy Scholarship for Siblings 10% of tuition fee entry level duration of study";
    } else if (subEntity === "sports") {
      normalizedQuery = "Vignan University Scholarships Policy sports quota 75% 50% scholarship state district level";
    } else if (intent === "WHO_CAN_APPLY") {
      normalizedQuery = "Vignan University Scholarships Policy eligibility criteria categories merit siblings sports alumni SC ST staff wards";
    } else {
      normalizedQuery = "Vignan University Scholarships Policy student scholarship fee concession eligibility criteria";
    }
  } else if (domain === "ADMISSION_REFUND") {
    normalizedQuery = "Vignan University Admission Policy cancellation of admission tuition fee refund norms percentage 100% 80% 50% last date";
  } else if (domain === "ATTENDANCE_REGULATION") {
    if (q.includes("condon")) {
      normalizedQuery = "Vignan University Academic Regulations attendance condonation 10% medical grounds 65% to 75% approval fee";
    } else {
      normalizedQuery = "Vignan University Academic Regulations minimum 75% aggregate attendance requirement semester end examinations";
    }
  } else if (domain === "CONSULTANCY") {
    normalizedQuery = "Vignan University Consultancy Policy faculty industrial advisory revenue sharing 60:40 70:30 permitted days";
  } else if (domain === "RESEARCH") {
    normalizedQuery = "Vignan University Research Policy seed money grants journal publication incentives SCI Scopus patent anti-plagiarism 10%";
  } else if (domain === "LEAVE") {
    if (subEntity === "casual_leave" || q.includes("casual")) {
      normalizedQuery = "Vignan University Service Rules faculty Casual Leave CL entitlement 15 days calendar year HOD sanction";
    } else if (subEntity === "probation" || q.includes("probation")) {
      normalizedQuery = "Vignan University Service Rules faculty probation period leave regulations casual leave pro-rata 1.25 days per month";
    } else if (subEntity === "maternity" || q.includes("maternity")) {
      normalizedQuery = "Vignan University Service Rules female faculty maternity leave 180 days 6 months paid leave";
    } else if (subEntity === "paternity" || q.includes("paternity")) {
      normalizedQuery = "Vignan University Service Rules paternity leave 15 days paid leave male employees";
    } else if (subEntity === "od_leave" || q.includes("duty") || q.includes("od")) {
      normalizedQuery = "Vignan University Service Rules faculty on-duty OD leave 15 days conferences workshops examination duties";
    } else {
      normalizedQuery = "Vignan University Service Rules faculty leave rules casual leave academic on duty maternity paternity leave";
    }
  }

  return {
    domain,
    intent,
    subEntity,
    normalizedQuery,
    keywords: rawTokens,
  };
}

/**
 * Classifies a document/clause into its canonical policy domain.
 */
export function classifyClauseDomain(
  policyTitle: string,
  category: string,
  section: string,
  clauseText: string,
): PolicyDomain {
  const blob = `${policyTitle} ${category} ${section}`.toLowerCase();
  const cat = (category || "").toLowerCase();

  if (blob.includes("scholarship") || cat === "scholarships") {
    return "SCHOLARSHIP";
  }
  if (blob.includes("admission") || cat === "admissions") {
    return "ADMISSION_REFUND";
  }
  if (blob.includes("consultancy")) {
    return "CONSULTANCY";
  }
  if (blob.includes("research") || cat === "research") {
    return "RESEARCH";
  }
  if (blob.includes("industrial training") || blob.includes("internship")) {
    return "TRAINING";
  }
  if (blob.includes("service rules") || blob.includes("paternity") || cat === "hr" || blob.includes("leave")) {
    return "LEAVE";
  }
  if (blob.includes("code of conduct") || cat === "discipline") {
    return "CONDUCT";
  }
  if (blob.includes("grievance")) {
    return "GRIEVANCE";
  }
  if (blob.includes("it policy") || cat === "it") {
    return "IT";
  }
  if (blob.includes("hostel") || cat === "hostel") {
    return "HOSTEL";
  }
  if (
    blob.includes("attendance") ||
    cat === "attendance" ||
    blob.includes("regulation") ||
    cat === "academic regulations"
  ) {
    return "ATTENDANCE_REGULATION";
  }

  return "GENERAL";
}

/**
 * Calculates lexical score between query terms and clause content.
 */
function calculateLexicalScore(
  tokens: string[],
  clauseText: string,
  section: string,
  title: string,
): number {
  if (!tokens.length) return 0;
  const blob = `${clauseText} ${section} ${title}`.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    if (blob.includes(t)) hits += 1;
  }
  return hits / tokens.length;
}

/**
 * Policy Search Agent — Domain-First Hybrid Retrieval & Reranking.
 * Enforces strict domain filtering and rejects irrelevant regulations on domain-specific queries.
 */
export function runPolicySearchAgent(
  input: PolicySearchInput,
  deps: PolicySearchDeps = {},
): PolicySearchOutput {
  const embed = deps.embed ?? embedText;
  const listClauses = deps.listClauses ?? (() => store.allClauses());
  const getPolicy = deps.getPolicy ?? ((id: string) => store.getPolicy(id));
  const topK = input.topK ?? 12;

  const analysis = analyzeQuery(input.question);
  const origVec = embed(input.question);
  const normVec = embed(analysis.normalizedQuery);
  const normTokens = extractTokens(analysis.normalizedQuery);

  const scored = listClauses()
    .map((clause) => {
      const policy = getPolicy(clause.policy_id);
      if (!policy) return null;

      // STRICT GUARD: Never retrieve mock or demo_only documents
      if (
        policy.status === "demo_only" ||
        policy.source_type === "MOCK_DEMO" ||
        (policy.source_file_url ?? "").startsWith("seed://")
      ) {
        return null;
      }

      // Role check: super_admin can see all, otherwise check audience
      if (!policy.audience.includes(input.role) && input.role !== "super_admin") return null;

      const clauseDomain = classifyClauseDomain(
        policy.title,
        policy.category,
        clause.section,
        clause.clause_text,
      );

      // --- DOMAIN-FIRST HARD GATE ---
      let domainScore = 0;
      if (analysis.domain !== "GENERAL") {
        if (clauseDomain === analysis.domain) {
          domainScore = 0.55;
        } else {
          // Severely penalize mismatch (e.g. asking scholarship, but document is B.Tech academic regulations)
          domainScore = -0.80;
        }
      }

      // Reject immediate mismatches if specific domain was identified
      if (analysis.domain !== "GENERAL" && domainScore < 0) {
        return null;
      }

      // Semantic similarity (max of original and normalized vector similarity)
      const simOrig = cosineSimilarity(origVec, clause.embedding_vector);
      const simNorm = cosineSimilarity(normVec, clause.embedding_vector);
      const semanticScore = Math.max(simOrig, simNorm);

      // Keyword / Lexical score
      const lexOrig = calculateLexicalScore(analysis.keywords, clause.clause_text, clause.section, policy.title);
      const lexNorm = calculateLexicalScore(normTokens, clause.clause_text, clause.section, policy.title);
      const keywordScore = Math.max(lexOrig, lexNorm);

      // Intent Relevance Boost
      let intentScore = 0;
      const textLower = clause.clause_text.toLowerCase();
      const sectionLower = clause.section.toLowerCase();

      if (analysis.domain === "SCHOLARSHIP") {
        if (analysis.subEntity === "backlog") {
          if (textLower.includes("backlog") || textLower.includes("first attempt") || sectionLower.includes("continuation") || sectionLower.includes("backlog")) {
            intentScore += 0.65;
          }
          if (textLower.includes("sibling") && !textLower.includes("backlog")) {
            intentScore -= 0.50;
          }
        } else if (analysis.subEntity === "sibling") {
          if (textLower.includes("sibling") || textLower.includes("10%")) {
            intentScore += 0.60;
          }
        } else if (analysis.subEntity === "sports") {
          if (textLower.includes("sport") || textLower.includes("75%")) {
            intentScore += 0.60;
          }
        } else if (analysis.intent === "MINIMUM_ELIGIBILITY" || analysis.intent === "CONTINUATION_RULES") {
          if (textLower.includes("70%") || textLower.includes("first attempt") || textLower.includes("continuation")) {
            intentScore += 0.45;
          }
          if (sectionLower.includes("continuation") || sectionLower.includes("special scholarships")) {
            intentScore += 0.30;
          }
        }
      } else if (analysis.domain === "LEAVE") {
        if (analysis.subEntity === "casual_leave") {
          if (textLower.includes("casual leave") || sectionLower.includes("casual leave") || textLower.includes("15 days")) {
            intentScore += 0.60;
          }
        } else if (analysis.subEntity === "probation") {
          if (textLower.includes("probation") || sectionLower.includes("probation") || textLower.includes("1.25 days")) {
            intentScore += 0.60;
          }
        } else if (analysis.subEntity === "maternity") {
          if (textLower.includes("maternity") || sectionLower.includes("maternity") || textLower.includes("180 days")) {
            intentScore += 0.60;
          }
        } else if (analysis.subEntity === "paternity") {
          if (textLower.includes("paternity") || sectionLower.includes("paternity")) {
            intentScore += 0.60;
          }
        } else if (analysis.subEntity === "od_leave") {
          if (textLower.includes("on-duty") || textLower.includes("on duty") || sectionLower.includes("on-duty")) {
            intentScore += 0.60;
          }
        }
      } else if (analysis.domain === "ADMISSION_REFUND") {
        if (textLower.includes("refund") || textLower.includes("cancellation")) {
          intentScore += 0.45;
        }
        if (textLower.includes("100%") || textLower.includes("80%")) {
          intentScore += 0.30;
        }
      } else if (analysis.domain === "ATTENDANCE_REGULATION") {
        if (textLower.includes("75%") || textLower.includes("minimum of 75%")) {
          intentScore += 0.40;
        }
        if (input.question.toLowerCase().includes("condon") && textLower.includes("condon")) {
          intentScore += 0.40;
        }
      }

      // Cohort regulation boost (ONLY applies for ATTENDANCE_REGULATION / GENERAL_ACADEMIC queries)
      let regBoost = 0;
      if (analysis.domain === "ATTENDANCE_REGULATION" || analysis.domain === "GENERAL") {
        const regInDoc = (clause.regulation || policy.regulation || "").toLowerCase();
        const explicitRegMatch = input.question.toLowerCase().match(/\b(r26|r25|r22\.1|r22|r21|r18)\b/i);
        if (explicitRegMatch) {
          if (regInDoc === explicitRegMatch[1].toLowerCase()) regBoost += 0.40;
          else if (regInDoc) regBoost -= 0.30;
        } else if (input.user_regulation) {
          if (regInDoc === input.user_regulation.toLowerCase()) regBoost += 0.25;
        }
      }

      const finalScore =
        semanticScore * 0.40 +
        keywordScore * 0.25 +
        domainScore +
        intentScore +
        regBoost;

      return toCandidate(policy, clause, finalScore);
    })
    .filter((c): c is CandidateClause => c !== null)
    .filter((c) => c.similarity_score >= 0.15)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topK);

  return { candidates: scored };
}

