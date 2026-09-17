# Phase 1 — Implementation report

## Status: COMPLETE (stop here; do not start Phase 2)

### 1. Files changed
- `backend/src/types.ts` — extended Policy, PolicyClause, SourceCitation
- `backend/src/db/normalize.ts` — **new** normalize/validate/backfill helpers
- `backend/src/db/persist.ts` — normalize on load + soft-save; ensureIndexes on Mongo connect
- `backend/src/db/mongo.ts` — `ensureIndexes()`
- `backend/src/db/store.ts` — citationFrom includes new citation fields
- `backend/src/db/seed.ts` — demo attendance chain with version labels / dates
- `backend/src/db/schema.sql` — documentation columns (Postgres not runtime)
- `backend/src/services/documentProcessor.ts` — write new metadata on upload
- `backend/src/routes/admin.ts` — upload fields, activate/supersede links, PATCH metadata
- `backend/scripts/migrateMetadata.ts` — **new** non-destructive migrate CLI
- `backend/package.json` — `migrate:metadata` script
- `backend/src/db/metadata.test.ts` — **new** Phase 1 tests
- `backend/src/agents/pipeline.test.ts` — fixtures use normalize*
- `frontend/src/types.ts` — PolicyRow / citation / clause row fields
- `frontend/src/api/client.ts` — `updatePolicyMetadata`
- `frontend/src/pages/Admin.tsx` — upload version label / until; Manage metadata view+edit

### 2. Database models
- **Reused** collections: `policies`, `clauses` (no new Mongo collections)
- Runtime store remains memory + Mongo/file snapshot

### 3. New fields
**Policy:** `family_id`, `description`, `version_label`, `effective_until`, `document_name`, `updated_at`, `superseded_by_id`, `approved_by`, `approval_date`, `metadata`  
**Clause:** `policy_version_label`, `sub_clause_number`, section/chapter fields, `parent_clause_id`, `hierarchy_path`, `source_document`, `created_at`, `updated_at`  
**Citation (optional):** `version_label`, `effective_until`, `hierarchy_path`

Status storage unchanged: `active` = CURRENT in UI, `superseded`, etc.

### 4. APIs
- Upload accepts optional `version_label`, `effective_until`, `description`, `approved_by`, `approval_date`
- `PATCH /api/admin/policies/:id/metadata` for thin admin edits
- Activate / supersession approve / supersede update `updated_at`, `superseded_by_id`, dates where safe
- List/get responses additive — existing clients still work

### 5. Migration
- On every load: normalize missing fields + backfill `superseded_by_id` / shared `family_id`
- Soft-save after Mongo load (no deletes)
- Optional: `npm run migrate:metadata --prefix backend` (loads → normalizes → saves)

### 6–7. Tests
```
npm test --prefix backend
→ 17 passed, 0 failed
```
Includes prior pipeline tests + Phase 1 metadata/upload tests.

### 8. Existing functionality verified
- Login / roles / chat pipeline / citations / admin queues unchanged in contract
- Seed demo attendance 1.0 → 2.0 labeled as demo data

### 9. Remaining limitations (Phase 2+)
- `page_number` is still clause index, not real PDF page
- No as-of-date agent logic yet (fields only)
- No evidence panel / timeline UX yet
- No audit log / analytics dashboard yet

**STOP — Phase 1 only.**
