# Phase 2 — Document extraction report

## Status: COMPLETE (stop before Phase 3 unless asked)

### What was done

1. **Hostel timings bug fix**
   - Cause: Answer agent refused when similarity was 0.18–0.22 even though governance already picked the hostel clause (search allows ≥0.18).
   - Fix: Lower refuse threshold to 0.12; boost hostel/timing fit in search + governance.
   - Result: “What are hostel entry timings?” now answers with 9:00/10:00 PM + citation.

2. **Real PDF page mapping**
   - PDF extract inserts `<<<PAGE N>>>` markers between pages.
   - `splitIntoClauses` assigns `page_number` from markers (`page_from_pdf: true`).
   - Plain text/DOCX: `page_number` stays `null` — **does not invent PDF pages**.

3. **Clause hierarchy**
   - Detects chapter/section/clause/sub-clause numbers.
   - Sets `hierarchy_path`, `parent_clause_id`, section/chapter fields on upload.

4. **Citation UI**
   - Source card shows hierarchy path + version_label when present.

### Tests
`npm test --prefix backend` → **21+ passed** (includes Phase 2 extract + hostel timings).

### Still not Phase 3+
- Evidence panel / policy detail timeline
- As-of-date historical agent
- Full contradiction register polish
