export type Role = "student" | "faculty" | "staff" | "super_admin";
export type PolicyStatus = "active" | "superseded" | "under_review" | "draft" | "expired";
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
}

export interface Policy {
  id: string;
  title: string;
  category: string;
  version_year: number;
  effective_date: string;
  status: PolicyStatus;
  source_file_url: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  authority_level: AuthorityLevel;
  department: string | null;
  audience: Role[];
  supersedes_id: string | null;
}

export interface PolicyClause {
  id: string;
  policy_id: string;
  clause_number: string;
  clause_text: string;
  section: string;
  page_number: number | null;
  embedding_vector: number[];
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
  clause_number: string;
  clause_text: string;
  effective_date: string;
  authority_level: AuthorityLevel;
  section: string;
  page_number: number | null;
  status: PolicyStatus;
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
}

export function normalizeRole(role: string): Role | null {
  const r = role.trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "admin") return "super_admin";
  if (r === "student" || r === "faculty" || r === "staff" || r === "super_admin") {
    return r;
  }
  return null;
}
