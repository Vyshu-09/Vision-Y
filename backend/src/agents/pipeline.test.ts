import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { runAmbiguityAgent } from "./ambiguityAgent.js";
import { runConflictAgent } from "./conflictAgent.js";
import { runGovernanceAgent } from "./governanceAgent.js";
import { runPolicySearchAgent } from "./policySearchAgent.js";
import { runPolicyPipeline } from "./pipeline.js";
import { runVersionAgent } from "./versionAgent.js";
import { requireRole } from "../middleware/auth.js";
import { seedDemoData } from "../db/seed.js";
import { embedText } from "../embeddings/embedder.js";
import { candidateToSource, type CandidateClause } from "./types.js";
import type { Policy, PolicyClause } from "../types.js";

seedDemoData();

function cand(overrides: Partial<CandidateClause> & Pick<CandidateClause, "clause_number" | "clause_text">): CandidateClause {
  return {
    policy_id: overrides.policy_id ?? overrides.clause_number,
    policy_title: overrides.policy_title ?? "Policy",
    category: overrides.category ?? "Attendance",
    version_year: overrides.version_year ?? 2024,
    effective_date: overrides.effective_date ?? "2024-07-01",
    status: overrides.status ?? "active",
    authority_level: overrides.authority_level ?? "university",
    department: overrides.department ?? null,
    similarity_score: overrides.similarity_score ?? 0.8,
    clause_number: overrides.clause_number,
    clause_text: overrides.clause_text,
    section: overrides.section ?? "Attendance",
    page_number: overrides.page_number ?? 1,
  };
}

describe("Version Agent", () => {
  it("drops superseded clauses unless the question is historical", () => {
    const candidates = [
      cand({ clause_number: "3.1", clause_text: "75% attendance", status: "active", policy_id: "new" }),
      cand({ clause_number: "3.1", clause_text: "80% attendance", status: "superseded", policy_id: "old" }),
    ];
    const current = runVersionAgent({ question: "Can I get condonation?", candidates });
    assert.equal(current.current_candidates.length, 1);
    assert.equal(current.current_candidates[0].policy_id, "new");
    assert.equal(current.historical_requested, false);

    const hist = runVersionAgent({ question: "What was the 2023 attendance rule?", candidates });
    assert.equal(hist.current_candidates.length, 2);
    assert.equal(hist.historical_requested, true);
  });
});

describe("Conflict Agent", () => {
  it("flags two active clauses with different attendance thresholds", () => {
    const result = runConflictAgent({
      current_candidates: [
        cand({
          policy_id: "uni",
          policy_title: "University Attendance",
          clause_number: "3.1",
          clause_text: "Minimum of 75% attendance is required for examinations.",
        }),
        cand({
          policy_id: "cse",
          policy_title: "CSE Lab Rules",
          authority_level: "department",
          clause_number: "2.1",
          clause_text: "Laboratory courses require 80% attendance. Condonation is limited.",
        }),
      ],
    });
    assert.equal(result.conflict, true);
    assert.equal(result.conflicting_pairs.length, 1);
  });
});

describe("Governance Agent", () => {
  it("picks university-wide policy over department when the best-fit clause is in conflict", () => {
    const uni = cand({
      policy_id: "uni",
      authority_level: "university",
      clause_number: "3.1",
      clause_text: "Minimum of 75% attendance is required.",
      similarity_score: 0.9,
    });
    const dept = cand({
      policy_id: "cse",
      authority_level: "department",
      clause_number: "2.1",
      clause_text: "Minimum of 80% attendance is required.",
      similarity_score: 0.7,
    });
    const out = runGovernanceAgent({
      question: "What is the minimum attendance?",
      current_candidates: [uni, dept],
      conflicting_pairs: [{ a: uni, b: dept, description: "75 vs 80" }],
    });
    assert.equal(out.escalated, false);
    assert.equal(out.applicable_clause?.policy_id, "uni");
  });

  it("picks newer effective date when authority levels tie", () => {
    const older = cand({
      policy_id: "old",
      authority_level: "university",
      clause_number: "1.1",
      clause_text: "Minimum of 70% attendance is required.",
      effective_date: "2024-07-01",
      similarity_score: 0.9,
    });
    const newer = cand({
      policy_id: "new",
      authority_level: "university",
      clause_number: "1.1",
      clause_text: "Minimum of 75% attendance is required.",
      effective_date: "2025-07-01",
      similarity_score: 0.85,
    });
    const out = runGovernanceAgent({
      question: "What is the minimum attendance?",
      current_candidates: [older, newer],
      conflicting_pairs: [{ a: older, b: newer, description: "70 vs 75" }],
    });
    assert.equal(out.escalated, false);
    assert.equal(out.applicable_clause?.policy_id, "new");
  });
});

describe("Ambiguity Agent", () => {
  it("asks for clarification on bare condonation questions", () => {
    const out = runAmbiguityAgent("Can I get condonation?");
    assert.equal(out.ambiguous, true);
    assert.ok((out.options?.length ?? 0) >= 2);
    assert.deepEqual(
      out.options?.map((o) => o.label),
      ["Attendance", "Fees", "Other"],
    );
  });

  it("does not block a specific attendance condonation question", () => {
    const out = runAmbiguityAgent("Can I get attendance condonation?");
    assert.equal(out.ambiguous, false);
  });
});

describe("Citation generation", () => {
  it("maps candidate clause fields into a Source & Clause citation", () => {
    const source = candidateToSource(
      cand({
        policy_id: "p1",
        policy_title: "Academic Regulations",
        clause_number: "5.2",
        clause_text: "Students must maintain 75% attendance.",
        version_year: 2024,
        effective_date: "2024-07-01",
        authority_level: "university",
        status: "active",
        section: "Attendance",
      }),
    );
    assert.equal(source.policy_title, "Academic Regulations");
    assert.equal(source.clause_number, "5.2");
    assert.equal(source.version_year, 2024);
    assert.equal(source.effective_date, "2024-07-01");
    assert.equal(source.authority_level, "university");
    assert.equal(source.status, "active");
    assert.equal(source.section, "Attendance");
  });
});

describe("Search Agent", () => {
  it("ranks minimum-attendance clauses above irrelevant text", () => {
    const attendance: Policy = {
      id: "p1",
      title: "Attendance Policy",
      category: "Attendance",
      version_year: 2025,
      effective_date: "2025-07-01",
      status: "active",
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "",
      authority_level: "university",
      department: null,
      audience: ["student"],
      supersedes_id: null,
    };
    const noise: Policy = {
      id: "p2",
      title: "IT Notes",
      category: "IT",
      version_year: 2025,
      effective_date: "2025-01-01",
      status: "active",
      source_file_url: null,
      uploaded_by: null,
      uploaded_at: "",
      authority_level: "department",
      department: "CSE",
      audience: ["student"],
      supersedes_id: null,
    };
    const clauses: PolicyClause[] = [
      {
        id: "c1",
        policy_id: "p1",
        clause_number: "3.1",
        clause_text:
          "A student shall maintain a minimum of 75% attendance in each course in a semester.",
        section: "Attendance",
        page_number: 1,
        embedding_vector: embedText(
          "A student shall maintain a minimum of 75% attendance in each course in a semester.",
        ),
      },
      {
        id: "c2",
        policy_id: "p2",
        clause_number: "9.9",
        clause_text: "Laptop purchase recommendations for programming clubs are informal.",
        section: "Misc",
        page_number: 99,
        embedding_vector: embedText(
          "Laptop purchase recommendations for programming clubs are informal.",
        ),
      },
    ];
    const out = runPolicySearchAgent(
      { question: "What is the minimum attendance requirement?", role: "student", topK: 5 },
      {
        listClauses: () => clauses,
        getPolicy: (id) => (id === "p1" ? attendance : id === "p2" ? noise : undefined),
      },
    );
    assert.ok(out.candidates.length >= 1);
    assert.match(out.candidates[0].clause_text, /75%/);
    assert.equal(out.candidates[0].policy_title, "Attendance Policy");
  });
});

describe("Unknown policy question", () => {
  it("refuses to invent policy when no clause is applicable", async () => {
    const out = await runPolicyPipeline({
      question: "What is the best laptop for programming?",
      role: "student",
      userId: "test-user",
    });
    assert.equal(out.escalated, true);
    assert.match(out.answer_text, /do not establish an authoritative answer/i);
    assert.equal(out.sources.length, 0);
  });
});

describe("Role authorization", () => {
  it("requireRole blocks non-admin callers with 403", () => {
    const guard = requireRole("super_admin");
    let statusCode = 0;
    let body: unknown;
    const req = { auth: { userId: "u1", role: "student", email: "s@x", name: "S" } } as Request;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    } as unknown as Response;
    let nextCalled = false;
    guard(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
    assert.deepEqual(body, { error: "Insufficient permissions" });
  });

  it("requireRole allows super_admin", () => {
    const guard = requireRole("super_admin");
    const req = {
      auth: { userId: "a1", role: "super_admin", email: "a@x", name: "A" },
    } as Request;
    const res = {} as Response;
    let nextCalled = false;
    guard(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});
