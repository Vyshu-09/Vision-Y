# UniPolicy AI · Agent 53

Multi-role assistant for university policy documents. Students, faculty, and staff ask questions in chat; every answer cites a **Source & Clause** card. Super admins upload policies, review supersessions and conflicts, and resolve flags and clarifications.

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, React Router (`frontend/`)
- **Backend:** Node.js + Express + TypeScript (`backend/`)
- **Data:** In-memory store with **file persistence** (`backend/data/store.json`) so uploads and activity survive restarts; Postgres schema also available in `backend/src/db/schema.sql`
- **LLM:** Anthropic Claude via `backend/src/llm/llmClient.ts` (falls back to a mock completer if `ANTHROPIC_API_KEY` is empty)

## Test accounts

Type email and password on the login page (choose the matching role first).

| Role | Email | Password |
| --- | --- | --- |
| Student (quick) | `student@university.edu` | `student123` |
| Faculty (quick) | `faculty@university.edu` | `faculty123` |
| Staff (quick) | `staff@university.edu` | `staff123` |
| Super Admin (quick) | `admin@university.edu` | `admin123` |

### Staff (from [Vignan People](https://vignan.ac.in/newvignan/people.php) · password `staff123`)

| Name | Email | Password | Emp ID |
| --- | --- | --- | --- |
| Dr Srinivasadesikan V | `drvsd_sh@vignan.ac.in` | `staff123` | 01447 |
| Mrs R. Swathika | `rs_ca@vignan.ac.in` | `staff123` | 03054 |
| Dr Ayyanna D S | `drads_ae@vignan.ac.in` | `staff123` | 01885 |
| Dr B N Naveen Kumar | `drbn_stat@vignan.ac.in` | `staff123` | 02339 |
| Dr Apoorva Singumahanthi | `drsvga_mgt@vignan.ac.in` | `staff123` | 02346 |
| Dr Vijaya Bhaskararao Bonam | `drvbr_psy@vignan.ac.in` | `staff123` | 40019 |
| Dr Shaik Mastan Sharif | `drsk_acse@vignan.ac.in` | `staff123` | 02490 |
| Mrs Nazma Sultana Shaik | `skns_it@vignan.ac.in` | `staff123` | 01203 |
| Dr Katikala Hima Bindu | `hbk_ece@vignan.ac.in` | `staff123` | 30104 |
| Dr Rameshbabu Kunchala | `drrk_phy@vignan.ac.in` | `staff123` | 40018 |

### Super Admins (password `admin123`)

| Name | Email | Password | Emp ID |
| --- | --- | --- | --- |
| Prof. Dr. K.V. Krishna Kishore | `kvkkishore@vignan.ac.in` | `admin123` | 163 |
| Dr. S. V. Phani Kumar | `drsvpk_cse@vignan.ac.in` | `admin123` | 675 |

Photos are from the Vignan people directory.

### Students (mock · password `student123`)

| Name | Email | Password |
| --- | --- | --- |
| Asha Patel | `asha.patel@vignan.ac.in` | `student123` |
| Rahul Sharma | `rahul.sharma@vignan.ac.in` | `student123` |
| Sneha Reddy | `sneha.reddy@vignan.ac.in` | `student123` |
| Arjun Nair | `arjun.nair@vignan.ac.in` | `student123` |
| Meera Krishnan | `meera.krishnan@vignan.ac.in` | `student123` |
| Vikram Singh | `vikram.singh@vignan.ac.in` | `student123` |
| Ananya Gupta | `ananya.gupta@vignan.ac.in` | `student123` |
| Karthik Rao | `karthik.rao@vignan.ac.in` | `student123` |
| Divya Iyer | `divya.iyer@vignan.ac.in` | `student123` |
| Nikhil Joshi | `nikhil.joshi@vignan.ac.in` | `student123` |

Students can upload their own photo from **My Profile**.

### CSE Faculty (from [Vignan People](https://vignan.ac.in/newvignan/people.php) · password `faculty123`)

| Name | Email | Password | Emp ID |
| --- | --- | --- | --- |
| Dr. J. Veeranjaneyulu | `drjvr_cse@vignan.ac.in` | `faculty123` | 02194 |
| Mr. D. Senthil | `sd_cse@vignan.ac.in` | `faculty123` | 03082 |
| Dr. G. Balu Narasimha Rao | `gbnr_cse@vignan.ac.in` | `faculty123` | 02181 |
| Mrs. G. Parimala | `gp_cse@vignan.ac.in` | `faculty123` | 646 |
| Mrs. Sai Spandana Verella | `ssv_cse@vignan.ac.in` | `faculty123` | 02696 |
| Mrs. Ch. Pushya | `chp_cse@vignan.ac.in` | `faculty123` | 01988 |
| Dr. Jhansi Lakshmi P. | `pjl_cse@vignan.ac.in` | `faculty123` | 01702 |
| Dr. R. Prathap Kumar | `rpk_cse@vignan.ac.in` | `faculty123` | 689 |
| Dr. Satish Kumar Satti | `sskumar_cse@vignan.ac.in` | `faculty123` | 02396 |

Hardcoded walkthrough question: **Can I get attendance condonation?**

## App flow

1. Sign in at `/` or `/login` with a role tile (student / faculty / staff / super_admin).
2. Role dashboards land at `/app/dashboard` (or `/app/admin` for super_admin).
3. **Ask AI** (`/app/chat`) runs the policy pipeline and shows citations, ambiguity options, and clarification / flag actions.
4. Policies, circulars/notices, notifications (with unread bell), and history/clarifications are role-scoped under `/app/*`.
5. Super admin governance: upload documents, activate review queue, resolve conflicts/flags/clarifications.

Vite proxies `/api` → `http://localhost:4000`.

## Run locally

```bash
npm install
cd backend && npm install && cd ../frontend && npm install
cd ..
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:4000

Frontend only: `npm run dev --prefix frontend` (API must already be on :4000).

Optional Claude answers: copy `backend/.env.example` to `backend/.env` and set `ANTHROPIC_API_KEY`.

Agent unit tests:

```bash
npm test --prefix backend
```

## Agent pipeline

`Search → Version → Conflict → Governance → Answer` in `backend/src/agents/`.

## Assumptions

- Monorepo with `frontend/` and `backend/` rather than two git repos
- Demo store is memory + file (`DATA_FILE=./data/store.json`); first run seeds demo data, then saves live changes
- Policies have `authority_level` (`university | department`) so the Governance Agent can apply precedence
