# Phase 5 — Ambiguity + Conflict deepen

## Status: COMPLETE (stop here; do not start Phase 6)

### Ambiguity Agent
Extended `backend/src/agents/ambiguityAgent.ts` beyond condonation/eligibility:
- Bare hostel / timing / curfew → weekday / weekend / general options
- Bare fee / fine / penalty → tuition / exam / late / other
- Bare leave → casual / medical / OD / other
- Vague short asks (`help`, `policy`) → topic picker
- Specific questions (e.g. weekday hostel return, attendance condonation) still pass through

### Conflict Agent
Extended `backend/src/agents/conflictAgent.ts` (detect only, no winner):
- Existing attendance % and fee amount mismatches
- Hostel return/entry clock mismatches
- Leave / day-count mismatches
- Shall / must vs shall not / must not polarity clashes on same topic

### Evidence UI
- `EvidencePanel` shows **Conflict detected — awaiting admin review** when escalated + flagged

### Tests
- New ambiguity + conflict unit cases in `pipeline.test.ts`
- Backend tests + frontend build verified

## Stop
Do not start Phase 6 (Contradiction Register polish) unless asked.
