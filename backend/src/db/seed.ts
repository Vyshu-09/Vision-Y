import bcrypt from "bcryptjs";
import { embedText } from "../embeddings/embedder.js";
import { store } from "./store.js";
import type { Policy, PolicyClause, Role, User } from "../types.js";

function user(
  partial: Omit<User, "id" | "password_hash" | "avatar_url" | "designation" | "employee_id" | "phone"> & {
    password: string;
    avatar_url?: string | null;
    designation?: string | null;
    employee_id?: string | null;
    phone?: string | null;
  },
): User {
  return {
    id: store.newId(),
    name: partial.name,
    email: partial.email,
    password_hash: bcrypt.hashSync(partial.password, 10),
    role: partial.role,
    department: partial.department,
    avatar_url: partial.avatar_url ?? null,
    designation: partial.designation ?? null,
    employee_id: partial.employee_id ?? null,
    phone: partial.phone ?? null,
  };
}

function policy(
  p: Omit<Policy, "id" | "uploaded_at" | "audience" | "supersedes_id"> & {
    audience?: Role[];
    supersedes_id?: string | null;
  },
): Policy {
  return {
    ...p,
    id: store.newId(),
    uploaded_at: store.now(),
    audience: p.audience ?? ["student", "faculty", "staff", "super_admin"],
    supersedes_id: p.supersedes_id ?? null,
  };
}

function clause(
  policyId: string,
  clause_number: string,
  clause_text: string,
  section = "General",
  page_number: number | null = null,
): PolicyClause {
  return {
    id: store.newId(),
    policy_id: policyId,
    clause_number,
    clause_text,
    section,
    page_number,
    embedding_vector: embedText(`${section} ${clause_number} ${clause_text}`),
  };
}

export function seedDemoData(): void {
  if (store.users.size > 0) return;

  const students = [
    {
      name: "Asha Patel",
      email: "asha.patel@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/asha.png",
      employee_id: "STU1001",
      phone: "9001001001",
    },
    {
      name: "Rahul Sharma",
      email: "rahul.sharma@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/rahul.png",
      employee_id: "STU1002",
      phone: "9001001002",
    },
    {
      name: "Sneha Reddy",
      email: "sneha.reddy@vignan.ac.in",
      department: "ECE",
      avatar_url: "/images/avatars/students/sneha.png",
      employee_id: "STU1003",
      phone: "9001001003",
    },
    {
      name: "Arjun Nair",
      email: "arjun.nair@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/arjun.png",
      employee_id: "STU1004",
      phone: "9001001004",
    },
    {
      name: "Meera Krishnan",
      email: "meera.krishnan@vignan.ac.in",
      department: "IT",
      avatar_url: "/images/avatars/students/meera.png",
      employee_id: "STU1005",
      phone: "9001001005",
    },
    {
      name: "Vikram Singh",
      email: "vikram.singh@vignan.ac.in",
      department: "MECH",
      avatar_url: "/images/avatars/students/vikram.png",
      employee_id: "STU1006",
      phone: "9001001006",
    },
    {
      name: "Ananya Gupta",
      email: "ananya.gupta@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/ananya.png",
      employee_id: "STU1007",
      phone: "9001001007",
    },
    {
      name: "Karthik Rao",
      email: "karthik.rao@vignan.ac.in",
      department: "ECE",
      avatar_url: "/images/avatars/students/karthik.png",
      employee_id: "STU1008",
      phone: "9001001008",
    },
    {
      name: "Divya Iyer",
      email: "divya.iyer@vignan.ac.in",
      department: "IT",
      avatar_url: "/images/avatars/students/divya.png",
      employee_id: "STU1009",
      phone: "9001001009",
    },
    {
      name: "Nikhil Joshi",
      email: "nikhil.joshi@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/nikhil.png",
      employee_id: "STU1010",
      phone: "9001001010",
    },
  ];

  // CSE faculty from vignan.ac.in/newvignan/people.php (photos from Facultyprofiles/uploads)
  const faculty = [
    {
      name: "Dr. J. Veeranjaneyulu",
      email: "drjvr_cse@vignan.ac.in",
      department: "CSE",
      designation: "Asst. Prof.",
      employee_id: "02194",
      phone: "9492246551",
      avatar_url: "/images/faculty/profilepic02194.JPG",
    },
    {
      name: "Mr. D. Senthil",
      email: "sd_cse@vignan.ac.in",
      department: "CSE",
      designation: "Assistant Professor (Contract)",
      employee_id: "03082",
      phone: "8925096166",
      avatar_url: "/images/faculty/profilepic03082.JPG",
    },
    {
      name: "Dr. G. Balu Narasimha Rao",
      email: "gbnr_cse@vignan.ac.in",
      department: "CSE",
      designation: "Asst. Prof.",
      employee_id: "02181",
      phone: "9701224847",
      avatar_url: "/images/faculty/profilepic02181.JPG",
    },
    {
      name: "Mrs. G. Parimala",
      email: "gp_cse@vignan.ac.in",
      department: "CSE",
      designation: "Asst. Prof.",
      employee_id: "646",
      phone: "9177649711",
      avatar_url: "/images/faculty/profilepic646.png",
    },
    {
      name: "Mrs. Sai Spandana Verella",
      email: "ssv_cse@vignan.ac.in",
      department: "CSE",
      designation: "Assistant Professor (Contract)",
      employee_id: "02696",
      phone: "9948368555",
      avatar_url: "/images/faculty/profilepic02696.png",
    },
    {
      name: "Mrs. Ch. Pushya",
      email: "chp_cse@vignan.ac.in",
      department: "CSE",
      designation: "Asst. Prof.",
      employee_id: "01988",
      phone: "7780112971",
      avatar_url: "/images/faculty/profilepic01988.JPG",
    },
    {
      name: "Dr. Jhansi Lakshmi P.",
      email: "pjl_cse@vignan.ac.in",
      department: "CSE",
      designation: "Assoc. Prof.",
      employee_id: "01702",
      phone: "8500719259",
      avatar_url: "/images/faculty/profilepic01702.png",
    },
    {
      name: "Dr. R. Prathap Kumar",
      email: "rpk_cse@vignan.ac.in",
      department: "CSE",
      designation: "Assoc. Prof.",
      employee_id: "689",
      phone: "7569888963",
      avatar_url: "/images/faculty/profilepic689.webp",
    },
    {
      name: "Dr. Satish Kumar Satti",
      email: "sskumar_cse@vignan.ac.in",
      department: "CSE",
      designation: "Assoc. Prof.",
      employee_id: "02396",
      phone: "9581236143",
      avatar_url: "/images/faculty/profilepic02396.jpg",
    },
  ];

  const staff = [
    {
      name: "Dr Srinivasadesikan V",
      email: "drvsd_sh@vignan.ac.in",
      department: "CHEMISTRY",
      designation: "Associate Professor",
      employee_id: "01447",
      phone: "7406940340",
      avatar_url: "/images/staff/profilepic01447.jpg",
    },
    {
      name: "Mrs R. Swathika",
      email: "rs_ca@vignan.ac.in",
      department: "CA",
      designation: "Assistant Professor",
      employee_id: "03054",
      phone: "9626494680",
      avatar_url: "/images/staff/profilepic03054.JPG",
    },
    {
      name: "Dr Ayyanna D S",
      email: "drads_ae@vignan.ac.in",
      department: "AGE",
      designation: "Assistant Professor",
      employee_id: "01885",
      phone: "9606342663",
      avatar_url: "/images/staff/profilepic01885.jpg",
    },
    {
      name: "Dr B N Naveen Kumar",
      email: "drbn_stat@vignan.ac.in",
      department: "MATHS AND STAT",
      designation: "Associate Professor",
      employee_id: "02339",
      phone: "9032302638",
      avatar_url: "/images/staff/profilepic02339.jpeg",
    },
    {
      name: "Dr Apoorva Singumahanthi",
      email: "drsvga_mgt@vignan.ac.in",
      department: "DMS",
      designation: "Associate Professor",
      employee_id: "02346",
      phone: "9000591700",
      avatar_url: "/images/staff/profilepic02346.jpeg",
    },
    {
      name: "Dr Vijaya Bhaskararao Bonam",
      email: "drvbr_psy@vignan.ac.in",
      department: "SSH",
      designation: "Assistant Professor",
      employee_id: "40019",
      phone: null,
      avatar_url: "/images/staff/profilepic40019.jpeg",
    },
    {
      name: "Dr Shaik Mastan Sharif",
      email: "drsk_acse@vignan.ac.in",
      department: "ACSE",
      designation: "Assistant Professor",
      employee_id: "02490",
      phone: "9848129660",
      avatar_url: "/images/staff/profilepic02490.JPG",
    },
    {
      name: "Mrs Nazma Sultana Shaik",
      email: "skns_it@vignan.ac.in",
      department: "IT",
      designation: "Assistant Professor",
      employee_id: "01203",
      phone: "9100844780",
      avatar_url: "/images/staff/profilepic01203.png",
    },
    {
      name: "Dr Katikala Hima Bindu",
      email: "hbk_ece@vignan.ac.in",
      department: "BME",
      designation: "Assistant Professor",
      employee_id: "30104",
      phone: "988521846",
      avatar_url: "/images/staff/profilepic30104.jpeg",
    },
    {
      name: "Dr Rameshbabu Kunchala",
      email: "drrk_phy@vignan.ac.in",
      department: "PHYSICS",
      designation: "Assistant Professor",
      employee_id: "40018",
      phone: "9492425201",
      avatar_url: "/images/staff/profilepic40018.jpg",
    },
  ];

  for (const s of students) store.insertUser(user({ ...s, password: "student123", role: "student" }));
  for (const f of faculty) store.insertUser(user({ ...f, password: "faculty123", role: "faculty" }));
  for (const st of staff) store.insertUser(user({ ...st, password: "staff123", role: "staff" }));

  // Quick demo aliases
  store.insertUser(
    user({
      name: "Asha Patel",
      email: "student@university.edu",
      password: "student123",
      role: "student",
      department: "CSE",
      avatar_url: "/images/avatars/students/asha.png",
      employee_id: "STU1001",
      phone: "9001001001",
    }),
  );
  store.insertUser(
    user({
      name: "Dr. Jhansi Lakshmi P.",
      email: "faculty@university.edu",
      password: "faculty123",
      role: "faculty",
      department: "CSE",
      designation: "Assoc. Prof.",
      employee_id: "01702",
      phone: "8500719259",
      avatar_url: "/images/faculty/profilepic01702.png",
    }),
  );
  store.insertUser(
    user({
      name: "Mrs Nazma Sultana Shaik",
      email: "staff@university.edu",
      password: "staff123",
      role: "staff",
      department: "IT",
      designation: "Assistant Professor",
      employee_id: "01203",
      phone: "9100844780",
      avatar_url: "/images/staff/profilepic01203.png",
    }),
  );

  // Super admins — Vignan leadership (photos from people.php)
  const admins = [
    {
      name: "Prof. Dr. K.V. Krishna Kishore",
      email: "kvkkishore@vignan.ac.in",
      department: "CSE",
      designation: "Professor & Dean, SOCI",
      employee_id: "163",
      phone: "9490647678",
      avatar_url: "/images/faculty/profilepic163.jpg",
    },
    {
      name: "Dr. S. V. Phani Kumar",
      email: "drsvpk_cse@vignan.ac.in",
      department: "CSE",
      designation: "Professor & HoD, CSE",
      employee_id: "675",
      phone: "9912514034",
      avatar_url: "/images/faculty/profilepic675.webp",
    },
  ];
  for (const a of admins) {
    store.insertUser(user({ ...a, password: "admin123", role: "super_admin" }));
  }

  const admin = user({
    name: "Prof. Dr. K.V. Krishna Kishore",
    email: "admin@university.edu",
    password: "admin123",
    role: "super_admin",
    department: "CSE",
    designation: "Professor & Dean, SOCI",
    employee_id: "163",
    phone: "9490647678",
    avatar_url: "/images/faculty/profilepic163.jpg",
  });
  store.insertUser(admin);

  // Demo chain: Attendance Policy 2024 (superseded) → Attendance Policy 2025 (CURRENT)
  const attendance2024 = policy({
    title: "Attendance Policy",
    category: "Attendance",
    version_year: 2024,
    effective_date: "2024-07-01",
    status: "superseded",
    source_file_url: "seed://attendance-2024",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "faculty", "staff", "super_admin"],
  });
  const attendance2025 = policy({
    title: "Attendance Policy",
    category: "Attendance",
    version_year: 2025,
    effective_date: "2025-07-01",
    status: "active",
    source_file_url: "seed://attendance-2025",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "faculty", "staff", "super_admin"],
    supersedes_id: attendance2024.id,
  });
  const cseLab = policy({
    title: "CSE Department Lab Attendance Rules",
    category: "Attendance",
    version_year: 2025,
    effective_date: "2025-08-01",
    status: "active",
    source_file_url: "seed://cse-lab-2025",
    uploaded_by: admin.id,
    authority_level: "department",
    department: "CSE",
    audience: ["student", "faculty", "super_admin"],
  });
  const examPolicy = policy({
    title: "University Examination Regulations",
    category: "Examinations",
    version_year: 2024,
    effective_date: "2024-06-15",
    status: "active",
    source_file_url: "seed://exam-2024",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "faculty", "staff", "super_admin"],
  });
  const reval = policy({
    title: "Revaluation Policy",
    category: "Examinations",
    version_year: 2025,
    effective_date: "2025-01-10",
    status: "active",
    source_file_url: "seed://reval-2025",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "faculty", "super_admin"],
  });
  const hostel = policy({
    title: "Hostel Rules and Regulations",
    category: "Hostel",
    version_year: 2024,
    effective_date: "2024-07-01",
    status: "active",
    source_file_url: "seed://hostel-2024",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "staff", "super_admin"],
  });
  const fee = policy({
    title: "Fee Payment and Refund Policy",
    category: "Fees",
    version_year: 2025,
    effective_date: "2025-04-01",
    status: "active",
    source_file_url: "seed://fees-2025",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["student", "staff", "super_admin"],
  });
  const facultyPol = policy({
    title: "Faculty Workload and Leave Regulations",
    category: "Faculty",
    version_year: 2024,
    effective_date: "2024-06-01",
    status: "active",
    source_file_url: "seed://faculty-2024",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["faculty", "super_admin"],
  });
  const hrPol = policy({
    title: "Staff HR and Service Regulations",
    category: "HR",
    version_year: 2024,
    effective_date: "2024-05-01",
    status: "active",
    source_file_url: "seed://hr-2024",
    uploaded_by: admin.id,
    authority_level: "university",
    department: null,
    audience: ["staff", "super_admin"],
  });

  for (const p of [
    attendance2024,
    attendance2025,
    cseLab,
    examPolicy,
    reval,
    hostel,
    fee,
    facultyPol,
    hrPol,
  ]) {
    store.insertPolicy(p);
  }

  const clauses: PolicyClause[] = [
    clause(
      attendance2025.id,
      "3.1",
      "A student shall maintain a minimum of 75% attendance in each course in a semester to be eligible to appear for the end-semester examination.",
      "Attendance",
      12,
    ),
    clause(
      attendance2025.id,
      "3.2",
      "Condonation of shortage of attendance: The Dean of the School may condone shortage of attendance up to 10% (i.e. attendance not below 65%) on medical grounds or other genuine reasons, provided the student submits supporting documents within 7 working days of returning to class and pays the prescribed condonation fee.",
      "Attendance",
      13,
    ),
    clause(
      attendance2025.id,
      "3.3",
      "The condonation fee is Rs. 500 per course. Condonation shall not be granted more than once in a programme except with Vice-Chancellor approval.",
      "Attendance",
      13,
    ),
    clause(
      attendance2025.id,
      "3.4",
      "Students with attendance below 65% shall not be eligible for condonation and must repeat the course.",
      "Attendance",
      14,
    ),
    clause(
      attendance2024.id,
      "3.1",
      "A student shall maintain a minimum of 80% attendance in each course to be eligible for the end-semester examination. Condonation up to 5% may be granted by the Principal.",
      "Attendance",
      10,
    ),
    clause(
      cseLab.id,
      "2.1",
      "For laboratory courses in the CSE department, a student shall maintain a minimum of 80% attendance. Shortage below 80% is not eligible for condonation except with Head of Department recommendation.",
      "Lab Attendance",
      4,
    ),
    clause(
      examPolicy.id,
      "5.1",
      "A student who is not eligible due to shortage of attendance shall be marked 'Debarred' for that course in the end-semester examination.",
      "Eligibility",
      18,
    ),
    clause(
      examPolicy.id,
      "5.2",
      "Re-registration for a debarred course follows the same attendance requirements as a first attempt.",
      "Eligibility",
      18,
    ),
    clause(
      reval.id,
      "2.1",
      "A student may apply for revaluation of theory end-semester answer scripts within 10 working days of result publication by paying the prescribed fee.",
      "Revaluation",
      3,
    ),
    clause(
      hostel.id,
      "4.1",
      "Hostel inmates must return by 9:00 PM on weekdays and 10:00 PM on weekends unless prior written permission is obtained from the Warden.",
      "Hostel Discipline",
      7,
    ),
    clause(
      fee.id,
      "1.2",
      "Semester tuition fees must be paid on or before the notified due date. Late payment attracts a fine of Rs. 100 per day up to a maximum of Rs. 2000.",
      "Fee Payment",
      2,
    ),
    clause(
      facultyPol.id,
      "6.1",
      "Faculty members are entitled to 12 days of casual leave and 8 days of special casual leave in an academic year as per university service rules.",
      "Leave",
      9,
    ),
    clause(
      hrPol.id,
      "3.1",
      "Non-teaching staff working hours are 9:00 AM to 5:00 PM with a one-hour lunch break. Overtime requires prior departmental approval.",
      "Service Conditions",
      5,
    ),
  ];
  for (const c of clauses) store.insertClause(c);

  store.insertCircular({
    id: store.newId(),
    title: "Clarification on Attendance Condonation Fee",
    circular_number: "CIR/08/2025",
    issued_date: "2025-08-12",
    description:
      "The condonation fee remains Rs. 500 per course for AY 2025-26. Applications must be routed through the class counsellor.",
    status: "active",
    modifies_policy_id: attendance2024.id,
    document_url: "seed://circular-08-2025",
  });
  store.insertCircular({
    id: store.newId(),
    title: "Exam Form Submission Timeline",
    circular_number: "CIR/03/2026",
    issued_date: "2026-03-01",
    description: "End-semester exam registration closes 15 days before the first exam date.",
    status: "active",
    modifies_policy_id: examPolicy.id,
    document_url: "seed://circular-03-2026",
  });

  store.insertConflict({
    id: store.newId(),
    policy_a_id: attendance2024.id,
    policy_b_id: cseLab.id,
    clause_a: "3.1",
    clause_b: "2.1",
    description:
      "University policy requires 75% attendance for all courses; CSE department lab rules require 80% with limited condonation. Both policies are currently active.",
    status: "open",
    resolved_by: null,
    created_at: store.now(),
  });

  const demoNotifications: Array<{
    roles: Role[];
    severity: "critical" | "warning" | "info";
    title: string;
    body: string;
    event_type:
      | "policy_updated"
      | "circular_published"
      | "conflict_detected"
      | "ambiguity_spike"
      | "clarification_request"
      | "review_pending"
      | "new_document";
    policy_id?: string | null;
  }> = [
    {
      roles: ["student"],
      severity: "info",
      title: "Attendance policy reminder",
      body: "Minimum 75% attendance is required. Condonation may apply between 65–75% with documents.",
      event_type: "policy_updated",
      policy_id: attendance2024.id,
    },
    {
      roles: ["student", "faculty"],
      severity: "warning",
      title: "Circular CIR/08/2025 published",
      body: "Clarification on attendance condonation fee for AY 2025-26.",
      event_type: "circular_published",
      policy_id: attendance2024.id,
    },
    {
      roles: ["faculty"],
      severity: "info",
      title: "Faculty leave policy available",
      body: "Casual leave and special casual leave rules are indexed for Policy AI chat.",
      event_type: "new_document",
      policy_id: facultyPol.id,
    },
    {
      roles: ["staff"],
      severity: "info",
      title: "HR service regulations online",
      body: "Staff working hours and overtime approval rules are now searchable.",
      event_type: "new_document",
      policy_id: hrPol.id,
    },
    {
      roles: ["staff", "super_admin"],
      severity: "critical",
      title: "Open conflict: Attendance vs CSE Lab",
      body: "University 75% vs CSE lab 80% attendance — awaiting Super Admin resolution.",
      event_type: "conflict_detected",
      policy_id: attendance2024.id,
    },
    {
      roles: ["super_admin"],
      severity: "warning",
      title: "Review pending",
      body: "At least one policy conflict and faculty flags may need governance action.",
      event_type: "review_pending",
      policy_id: cseLab.id,
    },
    {
      roles: ["faculty", "staff", "super_admin"],
      severity: "info",
      title: "Ambiguity spike watch",
      body: "Short queries like “condonation?” should trigger clarification options in chat.",
      event_type: "ambiguity_spike",
    },
    {
      roles: ["student", "faculty", "staff", "super_admin"],
      severity: "info",
      title: "Welcome to UniPolicy AI",
      body: "Ask policy questions in chat. Every answer cites an official clause when available.",
      event_type: "new_document",
    },
  ];

  for (const n of demoNotifications) {
    store.insertNotification({
      id: store.newId(),
      user_id: null,
      role_targets: n.roles,
      severity: n.severity,
      title: n.title,
      body: n.body,
      event_type: n.event_type,
      policy_id: n.policy_id ?? null,
      read: false,
      created_at: store.now(),
    });
  }
}
