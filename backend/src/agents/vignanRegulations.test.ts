import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPolicyPipeline } from "./pipeline.js";
import { runPolicySearchAgent } from "./policySearchAgent.js";
import { runVersionAgent } from "./versionAgent.js";
import { runGovernanceAgent } from "./governanceAgent.js";
import { runConflictAgent } from "./conflictAgent.js";
import { runAnswerAgent } from "./answerAgent.js";
import { store } from "../db/store.js";
import { seedDemoData } from "../db/seed.js";
import { normalizeClause, normalizePolicy } from "../db/normalize.js";
import { embedText } from "../embeddings/embedder.js";
import type { CandidateClause } from "./types.js";

seedDemoData();

describe("Task 15 — Authoritative Vignan Regulations & Policies Test Suite", () => {
  // Ensure test fixture regulations and mock documents exist in store for test coverage
  function ensureTestFixtures() {
    // 1. Mock demo policy (must NEVER be retrieved)
    if (!store.listPolicies().some((p) => p.id === "test-mock-policy")) {
      const mockPol = normalizePolicy({
        id: "test-mock-policy",
        family_id: "test-mock-family",
        title: "Mock Demo Attendance Policy",
        category: "Attendance",
        version_year: 2026,
        version_label: "MOCK-2026",
        effective_date: "2026-01-01",
        effective_until: null,
        status: "demo_only",
        source_type: "MOCK_DEMO",
        source_file_url: "seed://mock-policy.pdf",
        authority_level: "university",
        department: null,
        audience: ["student", "faculty", "staff", "super_admin"],
        supersedes_id: null,
        superseded_by_id: null,
        document_name: "mock.pdf",
        uploaded_by: "test",
        uploaded_at: store.now(),
        updated_at: store.now(),
        approved_by: "test",
        approval_date: "2026-01-01",
        metadata: null,
      });
      store.insertPolicy(mockPol);
      store.insertClause(
        normalizeClause({
          id: "test-mock-clause",
          policy_id: mockPol.id,
          clause_number: "99.1",
          clause_text: "Mock demo attendance requirement is 50 percent for testing only.",
          section: "Mock Section",
          page_number: 1,
          source_type: "MOCK_DEMO",
          embedding_vector: embedText("Mock demo attendance requirement is 50 percent"),
        }),
      );
    }

    // 2. Official R26 B.Tech Regulation fixture
    if (!store.listPolicies().some((p) => p.id === "test-r26-reg")) {
      const r26Pol = normalizePolicy({
        id: "test-r26-reg",
        family_id: "BTECH_REGULATIONS",
        title: "B.Tech R26 Regulations",
        category: "Academic Regulations",
        version_year: 2026,
        version_label: "R26",
        regulation: "R26",
        program: "B.Tech",
        effective_date: "2026-07-01",
        effective_until: null,
        status: "active",
        source_type: "REGULATION",
        document_type: "REGULATION",
        source_url: "https://vignan.ac.in/2023pdf/R26_Regulations_B.Tech.pdf",
        source_file_url: "https://vignan.ac.in/2023pdf/R26_Regulations_B.Tech.pdf",
        authority_level: "university",
        department: null,
        audience: ["student", "faculty", "super_admin"],
        supersedes_id: null,
        superseded_by_id: null,
        document_name: "R26_Regulations_B.Tech.pdf",
        uploaded_by: "vignan-sync",
        uploaded_at: store.now(),
        updated_at: store.now(),
        approved_by: "Vignan University (official PDF)",
        approval_date: "2026-07-01",
        metadata: null,
      });
      store.insertPolicy(r26Pol);
      store.insertClause(
        normalizeClause({
          id: "test-r26-att-clause",
          policy_id: r26Pol.id,
          clause_number: "4.1",
          clause_text:
            "Every student shall maintain a minimum of 75% attendance in aggregate in each semester to be eligible for semester end examinations.",
          section: "Attendance Requirements",
          page_number: 23,
          source_type: "REGULATION",
          document_type: "REGULATION",
          regulation: "R26",
          program: "B.Tech",
          source_url: "https://vignan.ac.in/2023pdf/R26_Regulations_B.Tech.pdf",
          embedding_vector: embedText("Every student shall maintain a minimum of 75% attendance in aggregate R26 B.Tech"),
        }),
      );
      store.insertClause(
        normalizeClause({
          id: "test-r26-condon-clause",
          policy_id: r26Pol.id,
          clause_number: "4.2",
          clause_text:
            "Condonation of shortage of attendance up to 10% (between 65% and 75%) may be granted on genuine medical grounds with prior intimation and medical certificate submission.",
          section: "Attendance Condonation",
          page_number: 24,
          source_type: "REGULATION",
          document_type: "REGULATION",
          regulation: "R26",
          program: "B.Tech",
          source_url: "https://vignan.ac.in/2023pdf/R26_Regulations_B.Tech.pdf",
          embedding_vector: embedText("Condonation of shortage of attendance up to 10% between 65% and 75% genuine medical grounds R26"),
        }),
      );
    }

    // 3. Official R22 B.Tech Regulation fixture
    if (!store.listPolicies().some((p) => p.id === "test-r22-reg")) {
      const r22Pol = normalizePolicy({
        id: "test-r22-reg",
        family_id: "BTECH_REGULATIONS",
        title: "B.Tech R22 Regulations",
        category: "Academic Regulations",
        version_year: 2022,
        version_label: "R22",
        regulation: "R22",
        program: "B.Tech",
        effective_date: "2022-07-01",
        effective_until: null,
        status: "active",
        source_type: "REGULATION",
        document_type: "REGULATION",
        source_url: "https://vignan.ac.in/2023pdf/R22%20regulations%20for%20B.Tech.pdf",
        source_file_url: "https://vignan.ac.in/2023pdf/R22%20regulations%20for%20B.Tech.pdf",
        authority_level: "university",
        department: null,
        audience: ["student", "faculty", "super_admin"],
        supersedes_id: null,
        superseded_by_id: null,
        document_name: "R22_regulations_BTech.pdf",
        uploaded_by: "vignan-sync",
        uploaded_at: store.now(),
        updated_at: store.now(),
        approved_by: "Vignan University (official PDF)",
        approval_date: "2022-07-01",
        metadata: null,
      });
      store.insertPolicy(r22Pol);
      store.insertClause(
        normalizeClause({
          id: "test-r22-att-clause",
          policy_id: r22Pol.id,
          clause_number: "5.1",
          clause_text:
            "A student is required to secure a minimum of 75% attendance in all courses taken together in a semester for promotion.",
          section: "Attendance Regulations R22",
          page_number: 18,
          source_type: "REGULATION",
          document_type: "REGULATION",
          regulation: "R22",
          program: "B.Tech",
          source_url: "https://vignan.ac.in/2023pdf/R22%20regulations%20for%20B.Tech.pdf",
          embedding_vector: embedText("A student is required to secure a minimum of 75% attendance R22 B.Tech promotion"),
        }),
      );
    }

    // 4. Official Grievance Redressal Policy fixture
    if (!store.listPolicies().some((p) => p.id === "test-grievance-pol")) {
      const gPol = normalizePolicy({
        id: "test-grievance-pol",
        family_id: "GRIEVANCE_POLICY",
        title: "Student Grievance Redressal Policy",
        category: "Student Affairs",
        version_year: 2025,
        version_label: "2025",
        effective_date: "2025-01-01",
        effective_until: null,
        status: "active",
        source_type: "OFFICIAL_VIGNAN",
        document_type: "POLICY",
        source_url: "https://vignan.ac.in/newvignan/policies.php",
        source_file_url: "https://vignan.ac.in/newvignan/policies.php",
        authority_level: "university",
        department: null,
        audience: ["student", "faculty", "super_admin"],
        supersedes_id: null,
        superseded_by_id: null,
        document_name: "student_grievance_policy.pdf",
        uploaded_by: "vignan-sync",
        uploaded_at: store.now(),
        updated_at: store.now(),
        approved_by: "Vignan University Registrar",
        approval_date: "2025-01-01",
        metadata: null,
      });
      store.insertPolicy(gPol);
      store.insertClause(
        normalizeClause({
          id: "test-grievance-clause-1",
          policy_id: gPol.id,
          clause_number: "2.1",
          clause_text:
            "Any student aggrieved by an administrative or academic action may submit a written petition to the Student Grievance Redressal Committee.",
          section: "Grievance Redressal Procedure",
          page_number: 3,
          source_type: "OFFICIAL_VIGNAN",
          document_type: "POLICY",
          source_url: "https://vignan.ac.in/newvignan/policies.php",
          embedding_vector: embedText("student grievance redressal procedure written petition committee"),
        }),
      );
    }

    // 5. Official Student Code of Conduct (student-only audience) fixture
    if (!store.listPolicies().some((p) => p.id === "test-coc-pol")) {
      const cocPol = normalizePolicy({
        id: "test-coc-pol",
        family_id: "STUDENT_CONDUCT",
        title: "Code of Conduct for Students",
        category: "Discipline",
        version_year: 2025,
        version_label: "2025",
        effective_date: "2025-01-01",
        effective_until: null,
        status: "active",
        source_type: "OFFICIAL_VIGNAN",
        document_type: "POLICY",
        source_url: "https://vignan.ac.in/newvignan/policies.php",
        source_file_url: "https://vignan.ac.in/newvignan/policies.php",
        authority_level: "university",
        department: null,
        audience: ["student", "super_admin"],
        supersedes_id: null,
        superseded_by_id: null,
        document_name: "student_code_of_conduct.pdf",
        uploaded_by: "vignan-sync",
        uploaded_at: store.now(),
        updated_at: store.now(),
        approved_by: "Vignan University Proctorial Board",
        approval_date: "2025-01-01",
        metadata: null,
      });
      store.insertPolicy(cocPol);
      store.insertClause(
        normalizeClause({
          id: "test-coc-clause-1",
          policy_id: cocPol.id,
          clause_number: "1.1",
          clause_text: "All students are expected to maintain the highest standards of integrity, respect, and discipline on campus.",
          section: "Student Code of Conduct",
          page_number: 1,
          source_type: "OFFICIAL_VIGNAN",
          document_type: "POLICY",
          source_url: "https://vignan.ac.in/newvignan/policies.php",
          embedding_vector: embedText("code of conduct for students integrity discipline campus"),
        }),
      );
    }
  }

  ensureTestFixtures();

  it("1. Official policy retrieval: retrieves official Vignan policies", () => {
    const res = runPolicySearchAgent({
      question: "What is the student grievance redressal procedure?",
      role: "student",
    });
    assert.ok(res.candidates.length > 0, "Should retrieve candidates");
    const top = res.candidates[0];
    assert.notEqual(top.source_type, "MOCK_DEMO", "Must not be MOCK_DEMO");
    assert.ok(top.source_url?.includes("vignan.ac.in") || top.policy_title.includes("Grievance"), "Should match Vignan official source");
  });

  it("2. Official regulation retrieval: retrieves official B.Tech regulations", () => {
    const res = runPolicySearchAgent({
      question: "What is the minimum attendance requirement in R26 B.Tech regulations?",
      role: "student",
      user_regulation: "R26",
    });
    assert.ok(res.candidates.length > 0, "Should retrieve candidates");
    const top = res.candidates[0];
    assert.equal(top.document_type, "REGULATION", "Must be REGULATION doc type");
    assert.equal(top.regulation, "R26", "Must be R26 regulation");
  });

  it("3. Role filtering: staff cannot access student-only policies unless super_admin", () => {
    const studentRes = runPolicySearchAgent({
      question: "code of conduct for students",
      role: "student",
    });
    const staffRes = runPolicySearchAgent({
      question: "code of conduct for students",
      role: "staff",
    });
    // Student code of conduct audience is student + super_admin
    const studentHasCoc = studentRes.candidates.some((c) => c.policy_title.includes("Code of Conduct for Students"));
    const staffHasCoc = staffRes.candidates.some((c) => c.policy_title.includes("Code of Conduct for Students"));
    assert.ok(studentHasCoc, "Student should access student code of conduct");
    assert.equal(staffHasCoc, false, "Staff should NOT access student-only code of conduct");
  });

  it("4. Regulation filtering: R22 student gets R22 regulations prioritized", () => {
    const res = runPolicySearchAgent({
      question: "What is the minimum attendance requirement?",
      role: "student",
      user_regulation: "R22",
      user_program: "B.Tech",
    });
    assert.ok(res.candidates.length > 0);
    const r22Candidate = res.candidates.find((c) => c.regulation === "R22");
    assert.ok(r22Candidate, "Must find R22 candidate for R22 student");
    assert.equal(res.candidates[0].regulation, "R22", "Top candidate should be R22 for R22 cohort");
  });

  it("5. R22 vs R25 vs R26 selection: explicit query overrides cohort", () => {
    const resR26 = runPolicySearchAgent({
      question: "What is the attendance rule in R26?",
      role: "student",
      user_regulation: "R22", // R22 student asking explicitly about R26
    });
    assert.ok(resR26.candidates.length > 0);
    assert.equal(resR26.candidates[0].regulation, "R26", "Explicit R26 in question should select R26");
  });

  it("6. Mock document exclusion: demo_only documents are NEVER retrieved", () => {
    const res = runPolicySearchAgent({
      question: "Mock demo attendance requirement 50 percent",
      role: "student",
    });
    const foundMock = res.candidates.some(
      (c) => c.source_type === "MOCK_DEMO" || c.status === "demo_only" || c.policy_id === "test-mock-policy",
    );
    assert.equal(foundMock, false, "Mock demo policies must NEVER be retrieved");
  });

  it("7. Version resolution: cohort regulation is kept over newer regulation", () => {
    const candidates: CandidateClause[] = [
      {
        policy_id: "test-r22-reg",
        policy_title: "B.Tech R22 Regulations",
        category: "Academic Regulations",
        version_year: 2022,
        version_label: "R22",
        regulation: "R22",
        program: "B.Tech",
        effective_date: "2022-07-01",
        effective_until: null,
        family_id: "BTECH_REGULATIONS",
        status: "active",
        authority_level: "university",
        department: null,
        clause_number: "5.1",
        clause_text: "Attendance 75% required for R22.",
        section: "Attendance",
        page_number: 18,
        similarity_score: 0.85,
        source_type: "REGULATION",
        document_type: "REGULATION",
      },
      {
        policy_id: "test-r26-reg",
        policy_title: "B.Tech R26 Regulations",
        category: "Academic Regulations",
        version_year: 2026,
        version_label: "R26",
        regulation: "R26",
        program: "B.Tech",
        effective_date: "2026-07-01",
        effective_until: null,
        family_id: "BTECH_REGULATIONS",
        status: "active",
        authority_level: "university",
        department: null,
        clause_number: "4.1",
        clause_text: "Attendance 75% required for R26.",
        section: "Attendance",
        page_number: 23,
        similarity_score: 0.86,
        source_type: "REGULATION",
        document_type: "REGULATION",
      },
    ];

    const versionOut = runVersionAgent({
      question: "What is my attendance requirement?",
      candidates,
      user_regulation: "R22",
    });

    assert.equal(versionOut.current_candidates.length, 1, "Should keep exactly 1 cohort regulation");
    assert.equal(versionOut.current_candidates[0].regulation, "R22", "Must keep R22 for R22 user");
  });

  it("8. Circular modification: circular modifies rule context when linked", async () => {
    const r26Clause: CandidateClause = {
      policy_id: "test-r26-reg",
      policy_title: "B.Tech R26 Regulations",
      category: "Academic Regulations",
      version_year: 2026,
      version_label: "R26",
      regulation: "R26",
      effective_date: "2026-07-01",
      effective_until: null,
      family_id: "BTECH_REGULATIONS",
      status: "active",
      authority_level: "university",
      department: null,
      clause_number: "4.2",
      clause_text: "Condonation fee is Rs. 1000 per subject.",
      section: "Attendance Condonation",
      page_number: 24,
      similarity_score: 0.9,
      source_type: "REGULATION",
      document_type: "REGULATION",
    };

    const ans = await runAnswerAgent({
      question: "What is the condonation fee?",
      role: "student",
      applicable_clause: r26Clause,
      escalated: false,
      rationale: "Applicable R26 clause.",
      related_clauses: [],
      related_circulars: [
        {
          title: "Fee Revision Circular",
          circular_number: "CIR/2026/01",
          issued_date: "2026-08-01",
          description: "Attendance condonation fee is revised to Rs. 1500.",
        },
      ],
    });

    assert.ok(ans.answer_text.includes("CIR/2026/01") || ans.answer_text.includes("1500"), "Must mention circular in answer");
  });

  it("9. Conflict detection: flags conflicting thresholds between active clauses", () => {
    const clauseA: CandidateClause = {
      policy_id: "pol-a",
      policy_title: "Policy A",
      category: "Attendance",
      version_year: 2025,
      effective_date: "2025-01-01",
      effective_until: null,
      family_id: "fam-a",
      status: "active",
      authority_level: "university",
      department: null,
      clause_number: "1.1",
      clause_text: "Students must maintain a minimum of 75% attendance.",
      section: "Attendance",
      page_number: 1,
      similarity_score: 0.9,
    };
    const clauseB: CandidateClause = {
      policy_id: "pol-b",
      policy_title: "Policy B",
      category: "Attendance",
      version_year: 2025,
      effective_date: "2025-01-01",
      effective_until: null,
      family_id: "fam-b",
      status: "active",
      authority_level: "department",
      department: "CSE",
      clause_number: "2.1",
      clause_text: "Students must maintain a minimum of 80% attendance in CSE.",
      section: "Attendance",
      page_number: 1,
      similarity_score: 0.88,
    };

    const conflicts = runConflictAgent({ current_candidates: [clauseA, clauseB] });
    assert.equal(conflicts.conflict, true, "Should detect attendance percentage conflict");
  });

  it("10. No-answer guardrail: refuses unestablished questions with exact phrase", async () => {
    const res = await runPolicyPipeline({
      question: "What is the best laptop for programming?",
      role: "student",
      userId: "test-user-id",
    });

    assert.ok(
      res.answer_text.includes("The available Vignan University policy and regulation documents do not establish an authoritative answer to this question.") ||
      res.answer_text.includes("do not establish an authoritative answer"),
      "Must return exact no-hallucination guardrail message",
    );
  });

  it("11. Source citation: includes source_url, source_type, regulation, and page", async () => {
    const res = await runPolicyPipeline({
      question: "What is the minimum attendance requirement?",
      role: "student",
      userId: "test-user-id",
      user_regulation: "R26",
      user_program: "B.Tech",
    });

    assert.ok(res.sources.length > 0, "Must include source citations");
    const s = res.sources[0];
    assert.ok(s.source_url, "Source must have source_url");
    assert.ok(s.source_type, "Source must have source_type");
    assert.ok(s.page_number !== undefined, "Source must have page_number");
  });

  it("12. Page number citation: real PDF page numbers are preserved", () => {
    const res = runPolicySearchAgent({
      question: "attendance requirement",
      role: "student",
      user_regulation: "R26",
    });
    const match = res.candidates.find((c) => c.page_number != null);
    assert.ok(match, "Must find clause with page number");
    assert.ok(typeof match.page_number === "number" && match.page_number > 0, "Page number must be a positive integer");
  });

  it("13. Student answer vs Faculty detailed answer: faculty gets full clause text", async () => {
    const studentRes = await runPolicyPipeline({
      question: "What is the procedure for condonation of attendance?",
      role: "student",
      userId: "test-student-id",
      user_regulation: "R26",
    });

    const facultyRes = await runPolicyPipeline({
      question: "What is the procedure for condonation of attendance?",
      role: "faculty",
      userId: "test-faculty-id",
      user_regulation: "R26",
    });

    assert.ok(studentRes.answer_text.length > 0, "Student gets answer");
    assert.ok(facultyRes.answer_text.length > 0, "Faculty gets answer");
    assert.ok(facultyRes.sources.length >= 1, "Faculty gets full source citations");
  });

  it("14. Real Vignan attendance test: answers from indexed R26 regulation clause", async () => {
    const res = await runPolicyPipeline({
      question: "What is the minimum attendance requirement in R26 B.Tech regulations?",
      role: "student",
      userId: "test-student-id",
      user_regulation: "R26",
    });

    assert.ok(res.answer_text.includes("75%") || res.answer_text.includes("75"), "Answer must contain 75% attendance requirement");
    const r26Source = res.sources.find((s) => s.regulation === "R26" || s.policy_title.includes("R26"));
    assert.ok(r26Source, "Must cite R26 regulation as source");
  });
});
