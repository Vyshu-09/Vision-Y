# Phase 4 — As-of-date Version Agent

## Done

### Login (restore + bot)
- Split layout restored in `frontend/src/pages/Login.tsx` (campus left ~52%, floating card right)
- Cute Agent 53 bot on the left with float animation (`agent-robo-cute-clear.png`)
- Auth / roles / remember-me unchanged
- Chat still uses **Ask Agent** + small animated robot

### Version Agent (as-of date)
- Parses `as of YYYY-MM-DD`, `as of July 2024`, `as on 15 Jan 2025`, `in 2024`
- Explicit `as_of_date` from API overrides parsed date
- Default path (no date phrase): keep **active-only** (unchanged)
- Historical keywords without a date: keep all candidates (legacy)
- Date-aware path: keep clauses where `effective_date <= as_of` and (`effective_until` null or `>= as_of`); one winning version per `family_id`

### Pipeline / API
- `PipelineInput` / `PipelineOutput` include `as_of_date` + `as_of_source`
- `POST /api/chat` accepts optional `as_of_date`
- Response includes `as_of_date` and `as_of_source` (`parsed` | `explicit` | `default`)

### Frontend
- Chat: optional **As of** date input
- EvidencePanel: shows **As of** date and source

### Tests
- Active-only still drops superseded
- As of 2025-01-15 → 2024 attendance version; as of 2025-08-01 (explicit) → 2025 version
- 22 backend tests passing; frontend build OK

## Stop
Do not start Phase 5 unless asked.
