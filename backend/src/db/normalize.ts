import type { Policy, PolicyClause } from "../types.js";

type LoosePolicy = Partial<Policy> &
  Pick<
    Policy,
    | "id"
    | "title"
    | "category"
    | "version_year"
    | "effective_date"
    | "status"
    | "source_file_url"
    | "uploaded_by"
    | "uploaded_at"
    | "authority_level"
    | "department"
    | "audience"
    | "supersedes_id"
  >;

type LooseClause = Partial<PolicyClause> &
  Pick<
    PolicyClause,
    "id" | "policy_id" | "clause_number" | "clause_text" | "section" | "page_number" | "embedding_vector"
  >;

/** ISO date (YYYY-MM-DD) or null. Rejects clearly invalid strings. */
export function parseIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s.slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return s.slice(0, 10);
}

/**
 * Validate effective range. Returns an error message or null if OK.
 * Null/empty until is allowed.
 */
export function validateEffectiveRange(
  effectiveFrom: string,
  effectiveUntil: string | null | undefined,
): string | null {
  const from = parseIsoDate(effectiveFrom);
  if (!from) return "effective_date must be a valid YYYY-MM-DD date";
  if (effectiveUntil == null || effectiveUntil === "") return null;
  const until = parseIsoDate(effectiveUntil);
  if (!until) return "effective_until must be a valid YYYY-MM-DD date or empty";
  if (until < from) return "effective_until must not be earlier than effective_date";
  return null;
}

export function normalizePolicy(raw: LoosePolicy): Policy {
  const uploaded_at = raw.uploaded_at || new Date().toISOString();
  let source_type = raw.source_type;
  if (!source_type) {
    const url = raw.source_file_url ?? "";
    if (raw.status === "demo_only" || url.startsWith("seed://") || url.includes("sample-antiragging")) {
      source_type = "MOCK_DEMO";
    } else if (url.includes("vignan.ac.in")) {
      source_type = raw.category?.toLowerCase().includes("regulation") ? "REGULATION" : "OFFICIAL_VIGNAN";
    } else {
      source_type = "UNIVERSITY_UPLOADED";
    }
  }

  let document_type = raw.document_type;
  if (!document_type) {
    if (source_type === "REGULATION" || raw.category?.toLowerCase().includes("regulation") || raw.title?.toLowerCase().includes("regulation")) {
      document_type = "REGULATION";
    } else {
      document_type = "POLICY";
    }
  }

  return {
    id: raw.id,
    family_id: raw.family_id?.trim() || raw.id,
    title: raw.title,
    category: raw.category,
    description: raw.description ?? null,
    version_year: raw.version_year,
    version_label: raw.version_label?.trim() || String(raw.version_year),
    effective_date: raw.effective_date,
    effective_until: raw.effective_until ?? null,
    status: raw.status,
    source_type,
    document_type,
    source_file_url: raw.source_file_url ?? null,
    source_url: raw.source_url ?? raw.source_file_url ?? null,
    source_page: raw.source_page ?? null,
    retrieved_at: raw.retrieved_at || uploaded_at,
    content_hash: raw.content_hash ?? null,
    document_version: raw.document_version ?? raw.version_label ?? String(raw.version_year),
    program: raw.program ?? (raw.title?.includes("B.Tech") ? "B.Tech" : null),
    regulation: raw.regulation ?? (raw.version_label?.startsWith("R") ? raw.version_label : null),
    document_name: raw.document_name ?? null,
    uploaded_by: raw.uploaded_by ?? null,
    uploaded_at,
    updated_at: raw.updated_at || uploaded_at,
    authority_level: raw.authority_level,
    department: raw.department ?? null,
    audience: raw.audience ?? [],
    supersedes_id: raw.supersedes_id ?? null,
    superseded_by_id: raw.superseded_by_id ?? null,
    approved_by: raw.approved_by ?? null,
    approval_date: raw.approval_date ?? null,
    metadata: raw.metadata ?? null,
  };
}

export function normalizeClause(raw: LooseClause, policyVersionLabel?: string, parentPolicy?: Policy): PolicyClause {
  const now = new Date().toISOString();
  const created_at = raw.created_at || now;
  const clause_number = raw.clause_number;
  return {
    id: raw.id,
    policy_id: raw.policy_id,
    policy_version_label:
      raw.policy_version_label?.trim() || policyVersionLabel || "",
    clause_number,
    sub_clause_number: raw.sub_clause_number ?? null,
    clause_text: raw.clause_text,
    section: raw.section ?? "",
    section_number: raw.section_number ?? null,
    section_title: raw.section_title ?? (raw.section || null),
    chapter_number: raw.chapter_number ?? null,
    chapter_title: raw.chapter_title ?? null,
    parent_clause_id: raw.parent_clause_id ?? null,
    hierarchy_path: raw.hierarchy_path?.trim() || clause_number,
    page_number: raw.page_number ?? null,
    source_document: raw.source_document ?? null,
    source_type: raw.source_type ?? parentPolicy?.source_type,
    document_type: raw.document_type ?? parentPolicy?.document_type,
    regulation: raw.regulation ?? parentPolicy?.regulation,
    program: raw.program ?? parentPolicy?.program,
    source_url: raw.source_url ?? parentPolicy?.source_url ?? parentPolicy?.source_file_url ?? null,
    retrieved_at: raw.retrieved_at ?? parentPolicy?.retrieved_at,
    embedding_vector: raw.embedding_vector ?? [],
    created_at,
    updated_at: raw.updated_at || created_at,
  };
}

/**
 * Soft migration: fill superseded_by_id from supersedes_id links,
 * and share family_id across title+category chains when still defaulted to self-id.
 */
export function backfillPolicyRelationships(policies: Policy[]): Policy[] {
  const byId = new Map(policies.map((p) => [p.id, { ...p }]));

  for (const p of byId.values()) {
    if (p.supersedes_id) {
      const older = byId.get(p.supersedes_id);
      if (older && !older.superseded_by_id) {
        older.superseded_by_id = p.id;
        older.updated_at = older.updated_at || p.uploaded_at;
      }
      // Walk chain to root for shared family_id when this row still uses self as family
      if (p.family_id === p.id) {
        let root = older;
        let guard = 0;
        while (root?.supersedes_id && byId.has(root.supersedes_id) && guard++ < 20) {
          root = byId.get(root.supersedes_id);
        }
        if (root) {
          const family = root.family_id === root.id ? root.id : root.family_id;
          root.family_id = family;
          p.family_id = family;
          // Propagate along known supersedes chain from root
          for (const q of byId.values()) {
            if (q.supersedes_id === root.id || q.id === p.id) {
              if (q.family_id === q.id || q.title === root.title) {
                if (q.title === root.title && q.category === root.category) {
                  q.family_id = family;
                }
              }
            }
          }
        }
      }
    }
  }

  // Group remaining same title+category that share a supersedes link into one family
  const groups = new Map<string, Policy[]>();
  for (const p of byId.values()) {
    const key = `${p.title.toLowerCase()}::${p.category.toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const linked = list.some((p) => p.supersedes_id && list.some((o) => o.id === p.supersedes_id));
    if (!linked) continue;
    const root =
      list.find((p) => !p.supersedes_id) ??
      [...list].sort((a, b) => a.effective_date.localeCompare(b.effective_date))[0];
    const family = root.family_id === root.id ? root.id : root.family_id;
    for (const p of list) {
      if (p.family_id === p.id) p.family_id = family;
    }
  }

  return [...byId.values()];
}

export function normalizeSnapshotPoliciesAndClauses(
  policies: Policy[],
  clauses: PolicyClause[],
): { policies: Policy[]; clauses: PolicyClause[] } {
  let nextPolicies = policies.map((p) => normalizePolicy(p as LoosePolicy));
  nextPolicies = backfillPolicyRelationships(nextPolicies);
  const policyById = new Map(nextPolicies.map((p) => [p.id, p]));
  const nextClauses = clauses.map((c) => {
    const pol = policyById.get(c.policy_id);
    return normalizeClause(c as LooseClause, pol?.version_label, pol);
  });
  return { policies: nextPolicies, clauses: nextClauses };
}
