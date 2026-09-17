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
  },
  {
    title: "Consultancy Policy",
    category: "Research",
    description: "Faculty consultancy and industry collaboration procedures.",
    pdf_url: "https://vignan.ac.in/pdf/Consultancy%20Policy.pdf",
    audience: FACULTY,
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
  },
  {
    title: "Divyangjan Policy",
    category: "Equity",
    description: "Accessibility and inclusion for persons with disabilities.",
    pdf_url: "https://vignan.ac.in/pdf/Policy%20on%20Divyangjan.pdf",
    audience: ALL,
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
