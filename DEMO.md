# Agent 53 — 7-minute demo cheat sheet

Use before viva. Start with: `npm run dev`  
Health check: `http://localhost:4000/api/health`

## Logins (type manually)
| Role | Email | Password |
|------|-------|----------|
| Student | `student@university.edu` | `student123` |
| Super Admin | `admin@university.edu` | `admin123` |

**Rehearsed OK (API smoke):** condonation cited · min attendance 75% (2025 university) · ambiguity chips · laptop refusal · admin open conflicts present.

---

## Timer script

### 0:00–0:40 — Open
Say: *Agent 53 answers from official documents with exact clause citations — not memory or generic AI.*  
→ Login as **Student** → glance at Dashboard.

### 0:40–2:10 — Core answer
**Ask AI** → paste:

`What is the procedure for condonation of attendance, and what is the maximum shortfall that can be condoned?`

(or: `Can I get attendance condonation?`)

Say while loading: *Ambiguity → Search → Version → Conflict → Governance → Answer.*  
Show: Answer + **Source & Clause** (clause **3.2**, university, active/current). Expect ~10% shortfall / not below 65%.

### 2:10–3:10 — Version + conflict
Ask: `What is the minimum attendance requirement?`  
Show: **Attendance Policy** year **2025**, clause **3.1**, **75%**, authority **university**.  
Say: *Version drops superseded; conflict 75% vs lab 80%; governance prefers university.*  
(Admin Conflicts already lists: CSE lab 80% vs Attendance Policy 75%.)

### 3:10–4:10 — Ambiguity
Ask: `Can I get condonation?`  
Show chips: **Attendance / Fees / Other** → click **Attendance** → cited answer (clause 3.2).  
Say: *We ask — we don’t guess.*

### 4:10–4:50 — Guardrail
Ask: `What is the best laptop for programming?`  
Exact line: *The available university policy documents do not establish an authoritative answer to this question.*  
Say: *Policy-grounded, not a generic chatbot.*

### 4:50–6:20 — Admin
Logout → choose **Super Admin** → login.  
Point: Insights charts · jump pills Upload / Versions / Conflicts / Clarifications / Flags.  
Open **Conflicts**: *Agent informs; authority decides.*

### 6:20–7:00 — Close
Say: *Cited answers, versioning, conflicts, ambiguity, circulars, logging, governance — with a hard no-hallucination guardrail.*  
Stop. Q&A.

---

## If something fails

| Problem | Fix |
| --- | --- |
| API down | `npm run dev` — health at `localhost:4000/api/health` |
| Wrong attendance year | Restart backend so seed/persist is fresh |
| No conflict in admin | Ask minimum attendance as student first |
| Forgot password | README test accounts |

## Don’t
- Pipeline chips (removed from UI)
- Live Agent 54/55/65 APIs
- Long PDF upload unless prepared
