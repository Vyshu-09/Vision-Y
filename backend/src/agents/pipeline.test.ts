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
import { store } from "../db/store.js";
import { embedText } from "../embeddings/embedder.js";
import { normalizeClause, normalizePolicy } from "../db/normalize.js";
import { candidateToSource, type CandidateClause } from "./types.js";
import type { Policy, PolicyClause } from "../types.js";

seedDemoData();

/** Minimal hostel fixture so pipeline tests do not depend on mock seed policies. */
function ensureHostelFixture(): void {
  if (store.listPolicies().some((p) => p.title === "Hostel Policy (test fixture)")) return;
  const policy = normalizePolicy({
    id: "test-hostel-policy",
    title: "Hostel Policy (test fixture)",
    category: "Hostel",
    version_year: 2025,
    version_label: "2025",
    effective_date: "2025-01-01",
    effective_until: null,
    family_id: "fam-hostel-test",
    status: "active",
    authority_level: "university",
    department: null,
    audience: ["student", "faculty", "staff", "super_admin"],
    supersedes_id: null,
    superseded_by_id: null,
    source_file_url: "test://hostel",
    document_name: "hostel-fixture.txt",
    description: "Test-only hostel timings",
    uploaded_by: "test",
    uploaded_at: store.now(),
    updated_at: store.now(),
    approved_by: "test",
    approval_date: "2025-01-01",
    metadata: { test: true },
  });
  store.insertPolicy(policy);
  const text =
    "Students must return to the hostel by 9:00 PM on weekdays. Late entry requires Warden approval.";
  store.insertClause(
    normalizeClause({
      id: "test-hostel-clause",
      policy_id: policy.id,
      clause_number: "4.2",
      clause_text: text,
      section: "Hostel Timings",
      page_number: 1,
      embedding_vector: embedText(`Hostel Timings 4.2 ${text}`),
    }),
  );
}

ensureHostelFixture();

function cand(overrides: Partial<CandidateClause> & Pick<CandidateClause, "clause_number" | "clause_text">): CandidateClause {
  return {
    policy_id: overrides.policy_id ?? overrides.clause_number,
    policy_title: overrides.policy_title ?? "Policy",
    category: overrides.category ?? "Attendance",
    version_year: overrides.version_year ?? 2024,
    effective_date: overrides.effective_date ?? "2024-07-01",
    effective_until: overrides.effective_until ?? null,
    family_id: overrides.family_id ?? "fam-attendance",
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
    assert.equal(current.as_of_source, "default");

    const hist = runVersionAgent({ question: "What was the previous attendance rule?", candidates });
    assert.equal(hist.current_candidates.length, 2);
    assert.equal(hist.historical_requested, true);
  });

  it("as of mid-range keeps the 2024 version; later date keeps 2025", () => {
    const candidates = [
      cand({
        policy_id: "att-2024",
        family_id: "fam-att",
        clause_number: "3.1",
        clause_text: "80% attendance",
        status: "superseded",
        version_year: 2024,
        effective_date: "2024-07-01",
        effective_until: "2025-06-30",
      }),
      cand({
        policy_id: "att-2025",
        family_id: "fam-att",
        clause_number: "3.1",
        clause_text: "75% attendance",
        status: "active",
        version_year: 2025,
        effective_date: "2025-07-01",
        effective_until: null,
      }),
    ];

    const mid = runVersionAgent({
      question: "What is the attendance rule as of 2025-01-15?",
      candidates,
    });
    assert.equal(mid.as_of_date, "2025-01-15");
    assert.equal(mid.as_of_source, "parsed");
    assert.equal(mid.current_candidates.length, 1);
    assert.equal(mid.current_candidates[0].policy_id, "att-2024");

    const later = runVersionAgent({
      question: "Attendance rule",
      candidates,
      as_of_date: "2025-08-01",
    });
    assert.equal(later.as_of_source, "explicit");
    assert.equal(later.current_candidates.length, 1);
    assert.equal(later.current_candidates[0].policy_id, "att-2025");
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

  it("flags hostel timing mismatches across policies", () => {
    const result = runConflictAgent({
      current_candidates: [
        cand({
          policy_id: "hostel-a",
          category: "Hostel",
          family_id: "fam-h1",
          policy_title: "Hostel Rules A",
          clause_number: "4.1",
          clause_text: "Students must return to the hostel by 9:00 PM on weekdays.",
        }),
        cand({
          policy_id: "hostel-b",
          category: "Hostel",
          family_id: "fam-h2",
          policy_title: "Hostel Rules B",
          clause_number: "4.1",
          clause_text: "Hostel curfew return time is 10:00 PM on weekdays.",
        }),
      ],
    });
    assert.equal(result.conflict, true);
    assert.match(result.conflicting_pairs[0].description, /Hostel timing mismatch/i);
  });

  it("flags leave day-count mismatches", () => {
    const result = runConflictAgent({
      current_candidates: [
        cand({
          policy_id: "leave-a",
          category: "Leave",
          family_id: "fam-l1",
          policy_title: "Leave Policy A",
          clause_number: "2.1",
          clause_text: "Casual leave shall not exceed 12 days in an academic year.",
        }),
        cand({
          policy_id: "leave-b",
          category: "Leave",
          family_id: "fam-l2",
          policy_title: "Leave Policy B",
          clause_number: "2.1",
          clause_text: "Maximum casual leave is 15 days per academic year.",
        }),
      ],
    });
    assert.equal(result.conflict, true);
    assert.match(result.conflicting_pairs[0].description, /Day-count mismatch/i);
  });

  it("flags shall vs shall-not polarity clashes", () => {
    const result = runConflictAgent({
      current_candidates: [
        cand({
          policy_id: "pol-a",
          category: "Library",
          family_id: "fam-lib1",
          policy_title: "Library A",
          clause_number: "1.1",
          clause_text: "Students shall be permitted to carry bags into the reading hall.",
        }),
        cand({
          policy_id: "pol-b",
          category: "Library",
          family_id: "fam-lib2",
          policy_title: "Library B",
          clause_number: "1.1",
          clause_text: "Students shall not be permitted to carry bags into the reading hall.",
        }),
      ],
    });
    assert.equal(result.conflict, true);
    assert.match(result.conflicting_pairs[0].description, /Polarity clash/i);
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

  it("asks for clarification on bare hostel / timing questions", () => {
    const out = runAmbiguityAgent("What is the hostel timing?");
    assert.equal(out.ambiguous, true);
    assert.match(out.prompt ?? "", /hostel/i);
    assert.ok((out.options?.length ?? 0) >= 2);
  });

  it("does not block specific weekday hostel return questions", () => {
    const out = runAmbiguityAgent("What is the weekday hostel return time?");
    assert.equal(out.ambiguous, false);
  });

  it("asks for clarification on bare fee questions", () => {
    const out = runAmbiguityAgent("What is the fee?");
    assert.equal(out.ambiguous, true);
    assert.match(out.prompt ?? "", /fee/i);
  });

  it("asks for clarification on bare leave questions", () => {
    const out = runAmbiguityAgent("leave rules");
    assert.equal(out.ambiguous, true);
    assert.match(out.prompt ?? "", /leave/i);
  });

  it("asks for clarification on vague short asks", () => {
    const out = runAmbiguityAgent("help");
    assert.equal(out.ambiguous, true);
    assert.ok((out.options?.length ?? 0) >= 3);
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
    const attendance: Policy = normalizePolicy({
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
    });
    const noise: Policy = normalizePolicy({
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
    });
    const clauses: PolicyClause[] = [
      normalizeClause({
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
      }),
      normalizeClause({
        id: "c2",
        policy_id: "p2",
        clause_number: "9.9",
        clause_text: "Laptop purchase recommendations for programming clubs are informal.",
        section: "Misc",
        page_number: 99,
        embedding_vector: embedText(
          "Laptop purchase recommendations for programming clubs are informal.",
        ),
      }),
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

describe("Hostel timings question", () => {
  it("answers from hostel clause instead of refusing with a citation", async () => {
    const out = await runPolicyPipeline({
      question: "What are hostel entry timings?",
      role: "student",
      userId: "test-user",
    });
    assert.equal(out.escalated, false);
    assert.equal(out.low_confidence, false);
    assert.match(out.answer_text, /9:00\s*PM/i);
    assert.ok(out.sources.length >= 1);
    assert.match(out.sources[0].clause_text, /Warden/i);
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
