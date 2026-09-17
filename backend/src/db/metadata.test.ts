import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  backfillPolicyRelationships,
  normalizeClause,
  normalizePolicy,
  normalizeSnapshotPoliciesAndClauses,
  validateEffectiveRange,
} from "./normalize.js";
import { processUploadedPolicy } from "../services/documentProcessor.js";
import { store } from "./store.js";
import type { Policy } from "../types.js";

describe("Phase 1 metadata normalize", () => {
  it("fills defaults for legacy policies without new fields", () => {
    const p = normalizePolicy({
      id: "legacy-1",
      title: "Old Policy",
      category: "Academic",
      version_year: 2024,
      effective_date: "2024-07-01",
      status: "active",
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "2024-07-01T00:00:00.000Z",
      authority_level: "university",
      department: null,
      audience: ["student"],
      supersedes_id: null,
    });
    assert.equal(p.family_id, "legacy-1");
    assert.equal(p.version_label, "2024");
    assert.equal(p.effective_until, null);
    assert.equal(p.superseded_by_id, null);
    assert.equal(p.document_name, null);
    assert.ok(p.updated_at);
  });

  it("rejects invalid effective ranges", () => {
    assert.equal(validateEffectiveRange("2025-07-01", null), null);
    assert.match(String(validateEffectiveRange("2025-07-01", "2024-01-01")), /not be earlier/);
    assert.match(String(validateEffectiveRange("nope", null)), /valid/);
  });

  it("backfills superseded_by_id from supersedes_id", () => {
    const older = normalizePolicy({
      id: "v1",
      title: "Attendance Policy",
      category: "Attendance",
      version_year: 2024,
      version_label: "1.0",
      effective_date: "2024-07-01",
      status: "superseded",
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "2024-07-01T00:00:00.000Z",
      authority_level: "university",
      department: null,
      audience: ["student"],
      supersedes_id: null,
    });
    const newer = normalizePolicy({
      id: "v2",
      title: "Attendance Policy",
      category: "Attendance",
      version_year: 2025,
      version_label: "2.0",
      effective_date: "2025-07-01",
      status: "active",
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "2025-07-01T00:00:00.000Z",
      authority_level: "university",
      department: null,
      audience: ["student"],
      supersedes_id: "v1",
    });
    const linked = backfillPolicyRelationships([older, newer]);
    const v1 = linked.find((p) => p.id === "v1")!;
    const v2 = linked.find((p) => p.id === "v2")!;
    assert.equal(v1.superseded_by_id, "v2");
    assert.equal(v2.family_id, v1.family_id);
  });

  it("defaults clause hierarchy_path to clause_number", () => {
    const c = normalizeClause({
      id: "c1",
      policy_id: "p1",
      clause_number: "4.2.1",
      clause_text: "Example",
      section: "Attendance",
      page_number: 1,
      embedding_vector: [],
    }, "3.0");
    assert.equal(c.hierarchy_path, "4.2.1");
    assert.equal(c.policy_version_label, "3.0");
    assert.equal(c.parent_clause_id, null);
  });

  it("keeps snapshot policies without new fields compatible", () => {
    const legacy = {
      id: "x",
      title: "T",
      category: "Fees",
      version_year: 2023,
      effective_date: "2023-01-01",
      status: "active" as const,
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "2023-01-01T00:00:00.000Z",
      authority_level: "university" as const,
      department: null,
      audience: ["student" as const],
      supersedes_id: null,
    };
    const { policies, clauses } = normalizeSnapshotPoliciesAndClauses(
      [legacy as Policy],
      [
        {
          id: "c",
          policy_id: "x",
          clause_number: "1",
          clause_text: "Pay fees",
          section: "Fees",
          page_number: 1,
          embedding_vector: [],
        } as never,
      ],
    );
    assert.equal(policies[0].version_label, "2023");
    assert.equal(clauses[0].hierarchy_path, "1");
  });
});

describe("Phase 1 upload metadata", () => {
  it("creates policy with version label and effective dates", () => {
    const before = store.listPolicies().length;
    const result = processUploadedPolicy({
      title: "Demo Metadata Policy",
      category: "Academic",
      version_year: 2026,
      version_label: "3.0",
      effective_date: "2026-07-01",
      effective_until: null,
      authority_level: "university",
      department: null,
      uploaded_by: "test-admin",
      source_file_url: "pasted://text",
      document_name: "demo.txt",
      description: "Demo Policy Data — For System Demonstration",
      text: "1. Students must follow campus rules.\n2. Violations may lead to discipline.",
      audience: ["student"],
    });
    assert.equal(result.policy.version_label, "3.0");
    assert.equal(result.policy.effective_date, "2026-07-01");
    assert.equal(result.policy.status, "under_review");
    assert.ok(result.clauses.length >= 1);
    assert.equal(result.clauses[0].policy_version_label, "3.0");
    assert.ok(result.clauses[0].hierarchy_path);
    assert.ok(store.listPolicies().length > before);

    // cleanup test policy
    store.deletePolicy(result.policy.id);
  });
});
