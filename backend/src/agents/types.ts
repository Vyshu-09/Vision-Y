import type {
  AuthorityLevel,
  DocumentType,
  Policy,
  PolicyClause,
  Role,
  SourceCitation,
  SourceType,
} from "../types.js";

export interface CandidateClause {
  policy_id: string;
  policy_title: string;
  category: string;
  version_year: number;
  version_label?: string;
  effective_date: string;
  effective_until: string | null;
  family_id: string;
  status: Policy["status"];
  authority_level: AuthorityLevel;
  department: string | null;
  clause_number: string;
  clause_text: string;
  section: string;
  page_number: number | null;
  similarity_score: number;
  source_type?: SourceType;
  document_type?: DocumentType;
  regulation?: string | null;
  program?: string | null;
  source_url?: string | null;
  retrieved_at?: string;
  hierarchy_path?: string;
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
  user_program?: string | null;
  user_regulation?: string | null;
  user_department?: string | null;
}

export interface PolicySearchOutput {
  candidates: CandidateClause[];
}

export interface VersionAgentInput {
  question: string;
  candidates: CandidateClause[];
  /** Explicit ISO date from API (overrides parsed date). */
  as_of_date?: string | null;
  user_regulation?: string | null;
  user_program?: string | null;
}

export type AsOfSource = "parsed" | "explicit" | "default";

export interface VersionAgentOutput {
  current_candidates: CandidateClause[];
  discarded_superseded: CandidateClause[];
  historical_requested: boolean;
  as_of_date: string;
  as_of_source: AsOfSource;
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
  user_regulation?: string | null;
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
  as_of_date?: string | null;
  user_program?: string | null;
  user_regulation?: string | null;
  user_department?: string | null;
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
  as_of_date: string;
  as_of_source: AsOfSource;
  is_out_of_scope?: boolean;
  not_found?: boolean;
  warning_title?: string;
  warning_message?: string;
}

export function toCandidate(policy: Policy, clause: PolicyClause, score: number): CandidateClause {
  return {
    policy_id: policy.id,
    policy_title: policy.title,
    category: policy.category,
    version_year: policy.version_year,
    version_label: policy.version_label,
    effective_date: policy.effective_date,
    effective_until: policy.effective_until,
    family_id: policy.family_id || policy.id,
    status: policy.status,
    authority_level: policy.authority_level,
    department: policy.department,
    clause_number: clause.clause_number,
    clause_text: clause.clause_text,
    section: clause.section,
    page_number: clause.page_number,
    similarity_score: score,
    source_type: clause.source_type ?? policy.source_type,
    document_type: clause.document_type ?? policy.document_type,
    regulation: clause.regulation ?? policy.regulation,
    program: clause.program ?? policy.program,
    source_url: clause.source_url ?? policy.source_url ?? policy.source_file_url ?? null,
    retrieved_at: clause.retrieved_at ?? policy.retrieved_at,
    hierarchy_path: clause.hierarchy_path,
  };
}

export function candidateToSource(c: CandidateClause): SourceCitation {
  return {
    policy_id: c.policy_id,
    policy_title: c.policy_title,
    version_year: c.version_year,
    version_label: c.version_label,
    clause_number: c.clause_number,
    clause_text: c.clause_text,
    effective_date: c.effective_date,
    effective_until: c.effective_until,
    authority_level: c.authority_level,
    section: c.section,
    page_number: c.page_number,
    status: c.status,
    hierarchy_path: c.hierarchy_path,
    source_type: c.source_type,
    document_type: c.document_type,
    regulation: c.regulation,
    program: c.program,
    source_url: c.source_url,
    retrieved_at: c.retrieved_at,
  };
}
