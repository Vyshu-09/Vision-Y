import type { AuthorityLevel, Policy, PolicyClause, Role, SourceCitation } from "../types.js";

export interface CandidateClause {
  policy_id: string;
  policy_title: string;
  category: string;
  version_year: number;
  effective_date: string;
  status: Policy["status"];
  authority_level: AuthorityLevel;
  department: string | null;
  clause_number: string;
  clause_text: string;
  section: string;
  page_number: number | null;
  similarity_score: number;
}

export interface ClarificationOption {
  id: string;
  label: string;
}

export interface AmbiguityResult {
  ambiguous: boolean;
  prompt: string | null;
  options: ClarificationOption[];
}

export interface PolicySearchInput {
  question: string;
  role: Role;
  topK?: number;
}

export interface PolicySearchOutput {
  candidates: CandidateClause[];
}

export interface VersionAgentInput {
  question: string;
  candidates: CandidateClause[];
}

export interface VersionAgentOutput {
  current_candidates: CandidateClause[];
  discarded_superseded: CandidateClause[];
  historical_requested: boolean;
}

export interface ConflictingPair {
  a: CandidateClause;
  b: CandidateClause;
  description: string;
}

export interface ConflictAgentInput {
  current_candidates: CandidateClause[];
}

export interface ConflictAgentOutput {
  conflict: boolean;
  conflicting_pairs: ConflictingPair[];
}

export interface GovernanceAgentInput {
  question: string;
  current_candidates: CandidateClause[];
  conflicting_pairs: ConflictingPair[];
}

export interface GovernanceAgentOutput {
  applicable_clause: CandidateClause | null;
  escalated: boolean;
  rationale: string;
}

export interface AnswerAgentInput {
  question: string;
  role: Role;
  applicable_clause: CandidateClause | null;
  escalated: boolean;
  rationale: string;
  related_clauses: CandidateClause[];
  related_circulars?: Array<{
    title: string;
    circular_number: string;
    issued_date: string;
    description: string;
  }>;
}

export interface AnswerAgentOutput {
  answer_text: string;
  sources: SourceCitation[];
  low_confidence: boolean;
}

export interface PipelineLogEntry {
  stage: string;
  timestamp: string;
  output: unknown;
}

export interface PipelineInput {
  question: string;
  role: Role;
  userId: string;
}

export interface PipelineOutput {
  answer_text: string;
  sources: SourceCitation[];
  low_confidence: boolean;
  escalated: boolean;
  flagged_for_admin: boolean;
  needs_clarification: boolean;
  clarification_prompt: string | null;
  clarification_options: ClarificationOption[];
  logs: PipelineLogEntry[];
}

export function toCandidate(policy: Policy, clause: PolicyClause, score: number): CandidateClause {
  return {
    policy_id: policy.id,
    policy_title: policy.title,
    category: policy.category,
    version_year: policy.version_year,
    effective_date: policy.effective_date,
    status: policy.status,
    authority_level: policy.authority_level,
    department: policy.department,
    clause_number: clause.clause_number,
    clause_text: clause.clause_text,
    section: clause.section,
    page_number: clause.page_number,
    similarity_score: score,
  };
}

export function candidateToSource(c: CandidateClause): SourceCitation {
  return {
    policy_id: c.policy_id,
    policy_title: c.policy_title,
    version_year: c.version_year,
    clause_number: c.clause_number,
    clause_text: c.clause_text,
    effective_date: c.effective_date,
    authority_level: c.authority_level,
    section: c.section,
    page_number: c.page_number,
    status: c.status,
  };
}
