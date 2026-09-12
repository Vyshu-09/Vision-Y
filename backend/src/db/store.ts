import { randomUUID } from "node:crypto";
import type {
  Circular,
  ClarificationTicket,
  ConflictRecord,
  FlagRecord,
  Notification,
  Policy,
  PolicyClause,
  QueryRecord,
  Role,
  SourceCitation,
  SupersessionReview,
  User,
} from "../types.js";

class MemoryStore {
  users = new Map<string, User>();
  policies = new Map<string, Policy>();
  clauses = new Map<string, PolicyClause>();
  circulars = new Map<string, Circular>();
  queries = new Map<string, QueryRecord>();
  flags = new Map<string, FlagRecord>();
  conflicts = new Map<string, ConflictRecord>();
  supersessions = new Map<string, SupersessionReview>();
  notifications = new Map<string, Notification>();
  clarifications = new Map<string, ClarificationTicket>();

  private listeners: Array<() => void> = [];

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }

  now(): string {
    return new Date().toISOString();
  }

  newId(): string {
    return randomUUID();
  }

  getUserByEmail(email: string): User | undefined {
    return [...this.users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  listUsersByRole(role: Role): User[] {
    return [...this.users.values()].filter((u) => u.role === role);
  }

  listPolicies(): Policy[] {
    return [...this.policies.values()].sort((a, b) => b.version_year - a.version_year);
  }

  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  clausesForPolicy(policyId: string): PolicyClause[] {
    return [...this.clauses.values()].filter((c) => c.policy_id === policyId);
  }

  allClauses(): PolicyClause[] {
    return [...this.clauses.values()];
  }

  listCirculars(): Circular[] {
    return [...this.circulars.values()].sort((a, b) => b.issued_date.localeCompare(a.issued_date));
  }

  getCircular(id: string): Circular | undefined {
    return this.circulars.get(id);
  }

  insertCircular(c: Circular): Circular {
    this.circulars.set(c.id, c);
    this.emitChange();
    return c;
  }

  insertUser(user: User): User {
    this.users.set(user.id, user);
    this.emitChange();
    return user;
  }

  updateUser(id: string, patch: Partial<User>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.users.set(id, updated);
    this.emitChange();
    return updated;
  }

  insertPolicy(policy: Policy): Policy {
    this.policies.set(policy.id, policy);
    this.emitChange();
    return policy;
  }

  updatePolicy(id: string, patch: Partial<Policy>): Policy | undefined {
    const existing = this.policies.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.policies.set(id, updated);
    this.emitChange();
    return updated;
  }

  insertClause(clause: PolicyClause): PolicyClause {
    this.clauses.set(clause.id, clause);
    this.emitChange();
    return clause;
  }

  insertQuery(record: QueryRecord): QueryRecord {
    this.queries.set(record.id, record);
    this.emitChange();
    return record;
  }

  listQueries(): QueryRecord[] {
    return [...this.queries.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  queriesForUser(userId: string): QueryRecord[] {
    return this.listQueries().filter((q) => q.user_id === userId);
  }

  insertFlag(flag: FlagRecord): FlagRecord {
    this.flags.set(flag.id, flag);
    this.emitChange();
    return flag;
  }

  updateFlag(id: string, patch: Partial<FlagRecord>): FlagRecord | undefined {
    const existing = this.flags.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.flags.set(id, updated);
    this.emitChange();
    return updated;
  }

  listFlags(): FlagRecord[] {
    return [...this.flags.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  insertConflict(conflict: ConflictRecord): ConflictRecord {
    this.conflicts.set(conflict.id, conflict);
    this.emitChange();
    return conflict;
  }

  updateConflict(id: string, patch: Partial<ConflictRecord>): ConflictRecord | undefined {
    const existing = this.conflicts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.conflicts.set(id, updated);
    this.emitChange();
    return updated;
  }

  listConflicts(): ConflictRecord[] {
    return [...this.conflicts.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  findOpenConflict(a: string, b: string, clauseA: string, clauseB: string): ConflictRecord | undefined {
    return [...this.conflicts.values()].find(
      (c) =>
        c.status === "open" &&
        ((c.policy_a_id === a && c.policy_b_id === b && c.clause_a === clauseA && c.clause_b === clauseB) ||
          (c.policy_a_id === b && c.policy_b_id === a && c.clause_a === clauseB && c.clause_b === clauseA)),
    );
  }

  insertSupersession(row: SupersessionReview): SupersessionReview {
    this.supersessions.set(row.id, row);
    this.emitChange();
    return row;
  }

  updateSupersession(id: string, patch: Partial<SupersessionReview>): SupersessionReview | undefined {
    const existing = this.supersessions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.supersessions.set(id, updated);
    this.emitChange();
    return updated;
  }

  listSupersessions(): SupersessionReview[] {
    return [...this.supersessions.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  insertNotification(n: Notification): Notification {
    this.notifications.set(n.id, n);
    this.emitChange();
    return n;
  }

  updateNotification(id: string, patch: Partial<Notification>): Notification | undefined {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.notifications.set(id, updated);
    this.emitChange();
    return updated;
  }

  listNotificationsFor(userId: string, role: Role): Notification[] {
    return [...this.notifications.values()]
      .filter((n) => {
        if (n.user_id && n.user_id === userId) return true;
        if (!n.user_id && n.role_targets.includes(role)) return true;
        return false;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  insertClarification(ticket: ClarificationTicket): ClarificationTicket {
    this.clarifications.set(ticket.id, ticket);
    this.emitChange();
    return ticket;
  }

  updateClarification(id: string, patch: Partial<ClarificationTicket>): ClarificationTicket | undefined {
    const existing = this.clarifications.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.clarifications.set(id, updated);
    this.emitChange();
    return updated;
  }

  listClarifications(): ClarificationTicket[] {
    return [...this.clarifications.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  listClarificationsForRole(role: Role, userId: string): ClarificationTicket[] {
    if (role === "student") {
      return this.listClarifications().filter((t) => t.raised_by === userId);
    }
    return this.listClarifications().filter(
      (t) => t.assigned_roles.includes(role) || role === "super_admin",
    );
  }

  policiesByCategory(category: string): Policy[] {
    return this.listPolicies().filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  stats() {
    const policies = this.listPolicies();
    return {
      documents: policies.length,
      current: policies.filter((p) => p.status === "active").length,
      superseded: policies.filter((p) => p.status === "superseded").length,
      under_review: policies.filter((p) => p.status === "under_review").length,
      circulars: this.listCirculars().filter((c) => c.status === "active").length,
      conflicts: this.listConflicts().filter((c) => c.status === "open").length,
      pending_reviews:
        this.listSupersessions().filter((s) => s.status === "pending").length +
        policies.filter((p) => p.status === "under_review").length,
      open_clarifications: this.listClarifications().filter((c) => c.status === "open").length,
      notifications: this.notifications.size,
      queries: this.queries.size,
      users: this.users.size,
    };
  }
}

export const store = new MemoryStore();

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar_url: user.avatar_url ?? null,
    designation: user.designation ?? null,
    employee_id: user.employee_id ?? null,
    phone: user.phone ?? null,
  };
}

export function citationFrom(policy: Policy, clause: PolicyClause): SourceCitation {
  return {
    policy_id: policy.id,
    policy_title: policy.title,
    version_year: policy.version_year,
    clause_number: clause.clause_number,
    clause_text: clause.clause_text,
    effective_date: policy.effective_date,
    authority_level: policy.authority_level,
    section: clause.section,
    page_number: clause.page_number,
    status: policy.status,
  };
}
