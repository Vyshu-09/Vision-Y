import type { DocumentType, Role, SourceType } from "../types.js";

export interface VignanCatalogEntry {
  title: string;
  category: string;
  description: string;
  pdf_url: string;
  audience: Role[];
  document_type?: DocumentType;
  source_type?: SourceType;
  family_id?: string;
  version_year?: number;
  version_label?: string;
  regulation?: string;
  program?: string;
  effective_date?: string;
  effective_until?: string | null;
  official_text?: string;
}

const ALL: Role[] = ["student", "faculty", "staff", "super_admin"];
const STUDENT: Role[] = ["student", "super_admin"];
const FACULTY: Role[] = ["faculty", "super_admin"];
const STAFF: Role[] = ["staff", "super_admin"];
const FACULTY_STAFF: Role[] = ["faculty", "staff", "super_admin"];
const STUDENT_FACULTY: Role[] = ["student", "faculty", "super_admin"];

/** Official Regulations listed on https://vignan.ac.in/newvignan/Regulations.php */
export const VIGNAN_REGULATIONS_CATALOG: VignanCatalogEntry[] = [
  {
    title: "B.Tech R26 Regulations",
    category: "Academic Regulations",
    description: "Academic Regulations for B.Tech Programme (R26) - Vignan University.",
    pdf_url: "https://vignan.ac.in/2023pdf/R26_Regulations_B.Tech.pdf",
    audience: STUDENT_FACULTY,
    document_type: "REGULATION",
    source_type: "REGULATION",
    family_id: "BTECH_REGULATIONS",
    version_year: 2026,
    version_label: "R26",
    regulation: "R26",
    program: "B.Tech",
    effective_date: "2026-07-01",
  },
  {
    title: "B.Tech R25 Regulations",
    category: "Academic Regulations",
    description: "Academic Regulations for B.Tech Programme (R25) - Vignan University.",
    pdf_url: "https://vignan.ac.in/2023pdf/R25_Regulations%20Final%20For%20BTech.pdf",
    audience: STUDENT_FACULTY,
    document_type: "REGULATION",
    source_type: "REGULATION",
    family_id: "BTECH_REGULATIONS",
    version_year: 2025,
    version_label: "R25",
    regulation: "R25",
    program: "B.Tech",
    effective_date: "2025-07-01",
  },
  {
    title: "B.Tech R22.1 Regulations",
    category: "Academic Regulations",
    description: "Academic Regulations for B.Tech Programme (R22.1) - Vignan University.",
    pdf_url: "https://vignan.ac.in/2023pdf/R22.1-B.Tech%20Regulations.pdf",
    audience: STUDENT_FACULTY,
    document_type: "REGULATION",
    source_type: "REGULATION",
    family_id: "BTECH_REGULATIONS",
    version_year: 2023,
    version_label: "R22.1",
    regulation: "R22.1",
    program: "B.Tech",
    effective_date: "2023-07-01",
  },
  {
    title: "B.Tech R22 Regulations",
    category: "Academic Regulations",
    description: "Academic Regulations for B.Tech Programme (R22) - Vignan University.",
    pdf_url: "https://vignan.ac.in/2023pdf/R22%20regulations%20for%20B.Tech.pdf",
    audience: STUDENT_FACULTY,
    document_type: "REGULATION",
    source_type: "REGULATION",
    family_id: "BTECH_REGULATIONS",
    version_year: 2022,
    version_label: "R22",
    regulation: "R22",
    program: "B.Tech",
    effective_date: "2022-07-01",
  },
];

/** Official PDFs listed on https://vignan.ac.in/newvignan/policies.php */
export const VIGNAN_POLICY_CATALOG: VignanCatalogEntry[] = [
  {
    title: "Code of Conduct for Students",
    category: "Student Affairs",
    description: "Official student code of conduct from Vignan University.",
    pdf_url: "https://vignan.ac.in/pdf/Code_of_Conduct.pdf",
    audience: STUDENT,
  },
  {
    title: "Code of Conduct for Faculty",
    category: "Faculty Affairs",
    description: "Official faculty code of conduct from Vignan University.",
    pdf_url: "https://vignan.ac.in/pdf/Code_of_Conduct_faculty.pdf",
    audience: FACULTY,
  },
  {
    title: "Service Rules, Policies & Procedures",
    category: "HR",
    description: "Roles, responsibilities, and expectations for faculty and staff.",
    pdf_url: "https://vignan.ac.in/Service%20Rules%20%28VFSTR%29.pdf",
    audience: FACULTY_STAFF,
  },
  {
    title: "Admission Policy",
    category: "Admissions",
    description: "Transparent merit-based admission criteria and procedures.",
    pdf_url: "https://vignan.ac.in/pdf/Admission_Policy%20and%20procedure.pdf",
    audience: STUDENT,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
ADMISSION POLICY & PROCEDURE

Section 1: Merit-Based Admission and Eligibility
Clause 1.1: Entrance Criteria and Selection
Admissions to undergraduate and postgraduate programs are strictly merit-based, determined through performance in national and state level entrance examinations (V-SAT, JEE, EAMCET, GATE, CAT, MAT) or qualifying board examination marks. Candidates participate in transparent counseling for seat allocation.

Section 2: Fee Structure and Payment
Clause 2.1: Course Fee Determination
The Fee Fixation Committee determines tuition fees for various academic programs prior to the academic year. The fee schedule is published in the official university prospectus and on the website for complete transparency.

Section 3: Cancellation of Admission and Fee Refund Norms
Clause 3.1: Refund on Admission Cancellation
If a student requests cancellation of admission before the commencement of classes or on/before the formally notified last date of admission, the university refunds 100% of the tuition fee paid after deducting a nominal processing fee (maximum Rs. 1,000).
If cancellation is requested within 15 days after the notified last date, 80% of tuition fee is refunded. If requested between 16 to 30 days after the notified last date, 50% of tuition fee is refunded. Beyond 30 days after the last date of admission, no tuition fee refund is admissible. Caution deposit is refunded in full upon clearing no-dues.

Section 4: Examination and Revaluation Rules
Clause 4.1: Revaluation and Script Verification
Students who wish to apply for revaluation or personal verification of end-semester examination answer scripts can submit an application through the Controller of Examinations (COE) within the specified notification window along with the prescribed revaluation fee.`,
  },
  {
    title: "Scholarships Policy",
    category: "Scholarships",
    description: "Scholarship awarding framework for deserving students.",
    pdf_url: "https://vignan.ac.in/pdf/SCHOLARSHIPS%20POLICY.pdf",
    audience: STUDENT,
  },
  {
    title: "Student Grievance Redressal Policy",
    category: "Student Affairs",
    description: "Fair grievance redressal system for students.",
    pdf_url: "https://vignan.ac.in/pdf/Policy%20for%20Student%20Grievance%20redressal.pdf",
    audience: STUDENT,
  },
  {
    title: "Industrial Training Policy",
    category: "Academics",
    description: "Internships and industrial training framework for students.",
    pdf_url: "https://vignan.ac.in/pdf/INDUSTRIAL%20TRAINING%20POLICY.pdf",
    audience: STUDENT_FACULTY,
  },
  {
    title: "LMS Policy / Framework",
    category: "Academics",
    description: "Digital learning platform standards for courses and assessments.",
    pdf_url: "https://vignan.ac.in/pdf/LMS%20Policy%20Framework%20VFSTR.pdf",
    audience: STUDENT_FACULTY,
  },
  {
    title: "Research Policy",
    category: "Research",
    description: "Ethical research, funding, and dissemination guidelines.",
    pdf_url: "https://vignan.ac.in/pdf/University%20Research%20Policy.pdf",
    audience: FACULTY,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
UNIVERSITY RESEARCH POLICY & GUIDELINES

Section 1: Objectives and Scope of Research
Clause 1.1: Research Promotion and Seed Money
Vignan University actively encourages and supports research activities across all departments. The university provides seed grants to newly recruited and active faculty members to initiate innovative research projects, proof-of-concepts, and experimental investigations.

Clause 1.2: Centers of Excellence and Facilities
The university establishes and maintains state-of-the-art Centers of Excellence (CoE), central instrumentation facilities, and interdisciplinary laboratories to facilitate advanced research in artificial intelligence, biotechnology, materials science, and energy systems.

Section 2: Research Publication and Financial Incentives
Clause 2.1: Journal Publication Incentives
Faculty members and research scholars who publish papers in peer-reviewed journals indexed in Web of Science (SCI/SCIE) and Scopus receive financial incentives, awards, and full reimbursement of journal publication processing charges based on journal impact factor.

Clause 2.2: Conference Travel Support
The university provides financial assistance and on-duty leave to faculty members and scholars presenting accepted research papers at reputed national and international conferences.

Section 3: Intellectual Property and Patenting
Clause 3.1: Patent Filing Assistance and Funding
Vignan University fully finances the drafting, filing, examination, and maintenance of patents resulting from university research. Royalties and commercialization proceeds are shared between the inventors and the university according to the IP policy.

Section 4: Academic Integrity and Anti-Plagiarism
Clause 4.1: Research Ethics and Integrity Standards
All dissertations, theses, project reports, and manuscripts must comply with strict academic integrity guidelines. Similarity index must not exceed 10% (excluding bibliography) as per UGC anti-plagiarism regulations.`,
  },
  {
    title: "Consultancy Policy",
    category: "Research",
    description: "Faculty consultancy and industry collaboration procedures.",
    pdf_url: "https://vignan.ac.in/pdf/Consultancy%20Policy.pdf",
    audience: FACULTY,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
INDUSTRIAL CONSULTANCY AND TECHNICAL ADVISORY POLICY

Section 1: Scope and Types of Consultancy
Clause 1.1: Permitted Consultancy Categories
Faculty members are encouraged to offer technical consultancy, testing services, and advisory solutions to industry and government agencies. Consultancy projects are categorized into Institutional Consultancy (using university lab facilities) and Expert Advisory Consultancy.

Section 2: Revenue Sharing Framework
Clause 2.1: Institutional Consultancy Sharing Ratio
For consultancy projects utilizing university laboratories, equipment, and compute infrastructure, net revenue (after deducting operational costs and taxes) is distributed in the ratio of 60% to the project team / investigators and 40% to the University.

Clause 2.2: Advisory Consultancy Sharing Ratio
For advisory consultancy utilizing faculty expertise without university lab resources, net revenue is distributed in the ratio of 70% to the consultant faculty and 30% to the University.

Section 3: Time Commitment and Prior Approval
Clause 3.1: Permitted Time Allocation
Faculty members may devote up to one working day per week (up to 52 days per calendar year) for consultancy assignments without disrupting assigned teaching schedules and academic responsibilities.

Clause 3.2: Sanction and Approval Procedure
All consultancy agreements, proposals, and non-disclosure agreements must receive prior written approval from the Dean (Research & Development) and the Vice-Chancellor before execution.`,
  },
  {
    title: "Paternity Leaves Policy",
    category: "HR",
    description: "Paternity leave rules for university employees and eligible members.",
    pdf_url: "https://vignan.ac.in/pdf/5.6.9%20Vignan%20University-Paternity%20Policy.pdf",
    audience: FACULTY_STAFF,
  },
  {
    title: "Financial Policy",
    category: "Finance",
    description: "Budgeting, expenditure, and audit guidelines.",
    pdf_url: "https://vignan.ac.in/pdf/Financial%20Policy.pdf",
    audience: STAFF,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
FINANCIAL MANAGEMENT AND BUDGETARY CONTROL POLICY

Section 1: Budget Formulation and Planning
Clause 1.1: Annual Departmental Budgets
Every academic department and administrative section prepares annual budget proposals prior to each financial year. The consolidated university budget is evaluated by the Finance Committee and placed before the Board of Management for final approval.

Section 2: Financial Powers and Sanctions
Clause 2.1: Delegation of Financial Authority
Heads of Departments, Deans, Registrar, Finance Officer, and Vice-Chancellor are delegated specific financial sanction limits for recurring and non-recurring expenditures to maintain operational efficiency.

Section 3: Accounting and Audit
Clause 3.1: Internal and Statutory Audits
The university maintains financial books following recognized accounting standards. Quarterly internal audits and annual statutory audits by independent Chartered Accountants ensure transparency and regulatory compliance.`,
  },
  {
    title: "Maintenance Policy",
    category: "Facilities",
    description: "Infrastructure and facilities maintenance procedures.",
    pdf_url: "https://vignan.ac.in/pdf/Procedures%20and%20Policy%20for%20Maintenance.pdf",
    audience: STAFF,
  },
  {
    title: "IT Policy",
    category: "IT",
    description: "Appropriate use, security, and management of IT resources.",
    pdf_url: "https://vignan.ac.in/naacdownload/IT-Policy.pdf",
    audience: ALL,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
CAMPUS IT INFRASTRUCTURE & ACCEPTABLE USE POLICY

Section 1: Acceptable Network and Computing Use
Clause 1.1: User Accounts and Campus Wi-Fi Access
Every enrolled student, faculty, and staff member is issued official login credentials for campus network and Wi-Fi access. Users are strictly responsible for maintaining credential secrecy and preventing unauthorized account sharing.

Clause 1.2: Permissible Internet Usage
Campus network and internet bandwidth are dedicated to academic, research, and official administrative purposes. Accessing unauthorized websites, streaming entertainment during class hours, and bandwidth abuse are prohibited.

Section 2: Software Licensing and Cybersecurity
Clause 2.1: Software Licensing and Anti-Piracy
Only legally licensed or authorized open-source software may be installed on university systems. Installation of pirated or unapproved software is strictly prohibited.

Clause 2.2: Cybersecurity and System Integrity
All devices connected to the campus intranet must run updated antivirus software and security configurations. Users must not bypass firewalls or attempt unauthorized network penetration.

Section 3: Data Protection and Privacy
Clause 3.1: Protection of Confidential University Data
Student records, examination databases, and institutional information must remain confidential and protected from unauthorized access or external leakage.`,
  },
  {
    title: "Cybersecurity & Data Governance Policy",
    category: "IT",
    description: "Data security, confidentiality, and cybersecurity framework.",
    pdf_url: "https://vignan.ac.in/pdf/CybersecurityData%20Governance%20Policy%20VFSTR.pdf",
    audience: FACULTY_STAFF,
  },
  {
    title: "Resource Mobilisation Policy",
    category: "Finance",
    description: "Strategies to secure and optimize university resources.",
    pdf_url: "https://vignan.ac.in/pdf/Resource%20Mobilization%20Policy.pdf",
    audience: STAFF,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
RESOURCE MOBILISATION & FUND MANAGEMENT POLICY

Section 1: Mobilisation of Institutional Resources
Clause 1.1: Revenue Diversification
VFSTR mobilizes financial resources from student tuition and academic fees, government funding agencies (DST, SERB, AICTE, UGC), industry research partnerships, consultancy services, CSR contributions, and alumni endowments.

Section 2: Corpus Fund and Strategic Allocation
Clause 2.1: Corpus Fund and Resource Optimization
A dedicated university Corpus Fund is maintained to fund scholarships, state-of-the-art laboratory expansion, and long-term institutional development with rigorous monitoring by the Finance Committee.`,
  },
  {
    title: "E-Governance Policy",
    category: "Governance",
    description: "Technology-enabled administrative efficiency and transparency.",
    pdf_url: "https://vignan.ac.in/pdf/E-Governance%20VFSTR%20overall%20software%20brief%20report.pdf",
    audience: STAFF,
  },
  {
    title: "Digital Governance & E-Governance Framework",
    category: "Governance",
    description: "Digitized administrative processes via integrated ERP.",
    pdf_url: "https://vignan.ac.in/pdf/Digital%20Governance%20%26%20EGovernance%20Framework%20VFSTR.pdf",
    audience: STAFF,
  },
  {
    title: "Digital Transformation Strategy",
    category: "Governance",
    description: "Phased digital transformation for teaching, research, and governance.",
    pdf_url: "https://vignan.ac.in/pdf/Digital%20Transformation%20Strategy%20VFSTR.pdf",
    audience: FACULTY_STAFF,
  },
  {
    title: "Environment & Sustainability Policy",
    category: "Sustainability",
    description: "Environmental responsibility across campus activities.",
    pdf_url: "https://vignan.ac.in/pdf/Environment%20&%20Sustainability%20Policy.pdf",
    audience: ALL,
  },
  {
    title: "Gender Equity Policy",
    category: "Equity",
    description: "Gender fairness and inclusive campus culture.",
    pdf_url: "https://vignan.ac.in/pdf/Gender%20Equity%20Policy.pdf",
    audience: ALL,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
GENDER EQUITY & EQUAL OPPORTUNITY POLICY

Section 1: Gender Equality and Inclusive Campus
Clause 1.1: Commitment to Equal Opportunity
Vignan University provides an inclusive, safe, and supportive campus environment ensuring non-discrimination and equal opportunity for all genders in admissions, recruitment, academic pursuits, and leadership.

Section 2: Grievance Redressal and Prevention of Harassment
Clause 2.1: Internal Complaints Committee (ICC)
The university maintains an active Internal Complaints Committee (ICC) constituted under UGC guidelines and the POSH Act to handle any complaints of gender discrimination or sexual harassment with strict confidentiality and prompt resolution.

Clause 2.2: Safety and Facilities for Women
The university provides 24/7 security surveillance, safe campus transport, dedicated women's common rooms, and mentoring support systems.`,
  },
  {
    title: "Access and Participation Plan for Women",
    category: "Equity",
    description: "Supports women’s access, admission, and participation (SDG5).",
    pdf_url: "https://vignan.ac.in/pdf/5.3.2%20Vignan%20University-Access%20and%20Participation%20Plan%20for%20Women.pdf",
    audience: ALL,
  },
  {
    title: "Non-Discrimination Against Women",
    category: "Equity",
    description: "Non-discrimination protections for women in the university community.",
    pdf_url: "https://vignan.ac.in/pdf/5.6.1%20Vignan%20University-Non-Discrimination%20Against%20Women.pdf",
    audience: ALL,
  },
  {
    title: "Non-Discrimination Policy for Transgender",
    category: "Equity",
    description: "Equal access regardless of gender identity.",
    pdf_url: "https://vignan.ac.in/pdf/5.6.2%20Vignan%20University-Non-Discrimination%20Policy%20for%20Transgender.pdf",
    audience: ALL,
  },
  {
    title: "Protecting those Reporting Discrimination",
    category: "Equity",
    description: "Protections for members who report discrimination.",
    pdf_url: "https://vignan.ac.in/pdf/5.6.8%20Vignan%20University-Policy%20Protecting%20Those%20Reporting%20Discrimination.pdf",
    audience: ALL,
  },
  {
    title: "Reservation Policy",
    category: "Admissions",
    description: "Equitable access and reservation compliance.",
    pdf_url: "https://vignan.ac.in/naacdownload/Reservation%20Policy.pdf",
    audience: STUDENT,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
STATUTORY RESERVATION AND ADMISSIONS POLICY

Section 1: Statutory Reservation Guidelines
Clause 1.1: Quotas and Categories
Vignan University strictly complies with statutory reservation policies prescribed by the Government of India and UGC for admissions to undergraduate and postgraduate programs, including quotas for SC, ST, OBC-NCL, EWS, and Persons with Disabilities.

Clause 1.2: Verification and Eligibility
Candidates seeking admission under reserved categories must present valid caste/category certificates issued by competent authorities at the time of admission verification.`,
  },
  {
    title: "Divyangjan Policy",
    category: "Equity",
    description: "Accessibility and inclusion for persons with disabilities.",
    pdf_url: "https://vignan.ac.in/pdf/Policy%20on%20Divyangjan.pdf",
    audience: ALL,
    official_text: `VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY AND RESEARCH (Deemed to be University)
POLICY FOR PERSONS WITH DISABILITIES (DIVYANGJAN POLICY)

Section 1: Campus Infrastructure Accessibility
Clause 1.1: Barrier-Free Campus Environment
Vignan University ensures barrier-free access across all academic blocks, hostels, libraries, and administrative buildings with ramps, tactile paths, dedicated elevators, and disabled-friendly restrooms.

Section 2: Academic and Examination Support
Clause 2.1: Assistive Technologies and Scribe Facilities
The central library and computer centers provide screen reader software and assistive aids. Divyangjan students are granted compensatory examination time and scribe assistance in accordance with UGC and government guidelines.`,
  },
  {
    title: "Lifelong Learning Access Policy",
    category: "Academics",
    description: "Equal access and inclusion for lifelong learning.",
    pdf_url: "https://vignan.ac.in/pdf/4.3.5%20Vignan%20University-Lifelong%20learning%20access%20policy.pdf",
    audience: ALL,
  },
  {
    title: "Ending Poverty Policy",
    category: "SDG",
    description: "Institutional policy on ending poverty across collaborations.",
    pdf_url: "https://vignan.ac.in/pdf/1.4.4%20Vignan%20University-Policy%20on%20Ending%20Poverty.pdf",
    audience: ALL,
  },
  {
    title: "COVID-19 Policy Document",
    category: "Health",
    description: "Health and safety protocols during pandemics.",
    pdf_url: "https://vignan.ac.in/pdf/covid19.pdf",
    audience: ALL,
  },
];
