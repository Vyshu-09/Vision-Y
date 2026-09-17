export type Role = "student" | "faculty" | "staff" | "super_admin";
export type PolicyStatus = "active" | "superseded" | "under_review" | "draft" | "expired" | "demo_only";
export type SourceType =
  | "OFFICIAL_VIGNAN"
  | "UNIVERSITY_UPLOADED"
  | "CIRCULAR"
  | "REGULATION"
  | "MOCK_DEMO";
export type DocumentType = "POLICY" | "REGULATION" | "HANDBOOK" | "CIRCULAR";
export type FlagStatus = "open" | "resolved";
export type ConflictStatus = "open" | "resolved";
export type AuthorityLevel = "university" | "department";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type CircularStatus = "active" | "withdrawn";
export type NotificationSeverity = "critical" | "warning" | "info";
export type NotificationEventType =
  | "policy_updated"
  | "circular_published"
  | "conflict_detected"
  | "ambiguity_spike"
  | "clarification_request"
  | "review_pending"
  | "new_document";
export type ClarificationStatus = "open" | "resolved";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  department: string | null;
  avatar_url: string | null;
  designation: string | null;
  employee_id: string | null;
  phone: string | null;
  admission_year?: number | null;
  program?: string | null;
  regulation?: string | null;
  batch?: string | null;
}

export interface Policy {
  id: string;
  /** Groups versions of the same logical policy. Defaults to `id` for legacy rows. */
  family_id: string;
  title: string;
  category: string;
  description: string | null;
  version_year: number;
  /** Human label e.g. "2.0"; defaults to String(version_year). */
  version_label: string;
  effective_date: string;
  effective_until: string | null;
  status: PolicyStatus;
  source_type?: SourceType;
  document_type?: DocumentType;
  source_file_url: string | null;
  source_url?: string | null;
  source_page?: number | null;
  retrieved_at?: string;
  content_hash?: string | null;
  document_version?: string | null;
  program?: string | null;
  regulation?: string | null;
  document_name: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
  authority_level: AuthorityLevel;
  department: string | null;
  audience: Role[];
  supersedes_id: string | null;
  superseded_by_id: string | null;
  approved_by: string | null;
  approval_date: string | null;
  metadata: Record<string, string> | null;
}

export interface PolicyClause {
  id: string;
  policy_id: string;
  policy_version_label: string;
  clause_number: string;
  sub_clause_number: string | null;
  clause_text: string;
  section: string;
  section_number: string | null;
  section_title: string | null;
  chapter_number: string | null;
  chapter_title: string | null;
  parent_clause_id: string | null;
  hierarchy_path: string;
  page_number: number | null;
  source_document: string | null;
  source_type?: SourceType;
  document_type?: DocumentType;
  regulation?: string | null;
  program?: string | null;
  source_url?: string | null;
  retrieved_at?: string;
  embedding_vector: number[];
  created_at: string;
  updated_at: string;
}

export interface Circular {
  id: string;
  title: string;
  circular_number: string;
  issued_date: string;
  description: string;
  status: CircularStatus;
  modifies_policy_id: string | null;
  document_url: string | null;
}

export interface QueryRecord {
  id: string;
  user_id: string;
  question_text: string;
  answer_text: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface SourceCitation {
  policy_id: string;
  policy_title: string;
  version_year: number;
  version_label?: string;
  clause_number: string;
  clause_text: string;
  effective_date: string;
  effective_until?: string | null;
  authority_level: AuthorityLevel;
  section: string;
  page_number: number | null;
  status: PolicyStatus;
  hierarchy_path?: string;
  source_type?: SourceType;
  document_type?: DocumentType;
  regulation?: string | null;
  program?: string | null;
  source_url?: string | null;
  retrieved_at?: string;
}

export interface FlagRecord {
  id: string;
  raised_by: string;
  policy_id: string | null;
  query_id: string | null;
  reason: string;
  status: FlagStatus;
  resolution_notes: string | null;
  created_at: string;
}

export interface ConflictRecord {
  id: string;
  policy_a_id: string;
  policy_b_id: string;
  clause_a: string;
  clause_b: string;
  description: string;
  status: ConflictStatus;
  resolved_by: string | null;
  created_at: string;
}

export interface SupersessionReview {
  id: string;
  old_policy_id: string;
  new_policy_id: string;
  status: ReviewStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  role_targets: Role[];
  severity: NotificationSeverity;
  title: string;
  body: string;
  event_type: NotificationEventType;
  policy_id: string | null;
  read: boolean;
  created_at: string;
}

export interface ClarificationTicket {
  id: string;
  raised_by: string;
  question_text: string;
  answer_text: string;
  reason: string;
  status: ClarificationStatus;
  assigned_roles: Role[];
  resolution_notes: string | null;
  resolved_by: string | null;
  policy_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  avatar_url: string | null;
  designation: string | null;
  employee_id: string | null;
  phone: string | null;
  admission_year?: number | null;
  program?: string | null;
  regulation?: string | null;
  batch?: string | null;
}

export function normalizeRole(role: string): Role | null {
  const r = role.trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "admin") return "super_admin";
  if (r === "student" || r === "faculty" || r === "staff" || r === "super_admin") {
    return r;
  }
  return null;
}
