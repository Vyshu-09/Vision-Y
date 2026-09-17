import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinPagesWithMarkers, splitIntoClauses } from "../services/documentProcessor.js";

describe("Phase 2 document extraction", () => {
  it("maps clauses to real PDF page markers", () => {
    const text = joinPagesWithMarkers([
      { page: 1, text: "Chapter 4 Attendance\n\n1.1 Intro text about the policy scope and purpose for students." },
      {
        page: 7,
        text: "4.1 Hostel inmates must return by 9:00 PM on weekdays and 10:00 PM on weekends unless prior written permission is obtained from the Warden.",
      },
      { page: 8, text: "4.2 Visitors must register at the gate before 8:00 PM every evening without exception." },
    ]);
    const clauses = splitIntoClauses(text, "Hostel");
    assert.ok(clauses.length >= 2);
    const c41 = clauses.find((c) => c.clause_number === "4.1");
    assert.ok(c41);
    assert.equal(c41!.page_number, 7);
    assert.equal(c41!.page_from_pdf, true);
    assert.match(c41!.hierarchy_path, /4\.1/);
  });

  it("does not invent PDF page numbers for plain text", () => {
    const text = `1.1 First clause about academic rules that students must follow carefully.

2.1 Second clause about examination eligibility and attendance thresholds.`;
    const clauses = splitIntoClauses(text, "Academic");
    assert.ok(clauses.length >= 2);
    assert.equal(clauses[0].page_from_pdf, false);
    assert.equal(clauses[0].page_number, null);
  });

  it("builds parent/sub-clause hierarchy from numbered clauses", () => {
    const text = `4.2 Minimum Attendance requirements for every course.

4.2.1 A student shall maintain a minimum of 75% attendance in each course.

4.2.2 Condonation may be granted up to 10% in exceptional cases.`;
    const clauses = splitIntoClauses(text, "Attendance");
    const sub = clauses.find((c) => c.clause_number === "4.2.1");
    assert.ok(sub);
    assert.equal(sub!.parent_clause_number, "4.2");
    assert.ok(sub!.hierarchy_path.includes("4.2.1"));
  });
});
