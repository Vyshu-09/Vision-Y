import bcrypt from "bcryptjs";
import { cloudMedia } from "../media/cloudMedia.js";
import { store } from "./store.js";
import type { User } from "../types.js";

function user(
  partial: Omit<User, "id" | "password_hash" | "avatar_url" | "designation" | "employee_id" | "phone"> & {
    password: string;
    avatar_url?: string | null;
    designation?: string | null;
    employee_id?: string | null;
    phone?: string | null;
    admission_year?: number | null;
    program?: string | null;
    regulation?: string | null;
    batch?: string | null;
  },
): User {
  return {
    id: store.newId(),
    name: partial.name,
    email: partial.email,
    password_hash: bcrypt.hashSync(partial.password, 10),
    role: partial.role,
    department: partial.department,
    avatar_url: cloudMedia(partial.avatar_url ?? null),
    designation: partial.designation ?? null,
    employee_id: partial.employee_id ?? null,
    phone: partial.phone ?? null,
    admission_year: partial.admission_year ?? null,
    program: partial.program ?? null,
    regulation: partial.regulation ?? null,
    batch: partial.batch ?? null,
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
      program: "B.Tech",
      admission_year: 2026,
      regulation: "R26",
      batch: "2026",
    },
    {
      name: "Rahul Sharma",
      email: "rahul.sharma@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/rahul.png",
      employee_id: "STU1002",
      phone: "9001001002",
      program: "B.Tech",
      admission_year: 2025,
      regulation: "R25",
      batch: "2025",
    },
    {
      name: "Sneha Reddy",
      email: "sneha.reddy@vignan.ac.in",
      department: "ECE",
      avatar_url: "/images/avatars/students/sneha.png",
      employee_id: "STU1003",
      phone: "9001001003",
      program: "B.Tech",
      admission_year: 2022,
      regulation: "R22",
      batch: "2022",
    },
    {
      name: "Arjun Nair",
      email: "arjun.nair@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/arjun.png",
      employee_id: "STU1004",
      phone: "9001001004",
      program: "B.Tech",
      admission_year: 2022,
      regulation: "R22",
      batch: "2022",
    },
    {
      name: "Meera Krishnan",
      email: "meera.krishnan@vignan.ac.in",
      department: "IT",
      avatar_url: "/images/avatars/students/meera.png",
      employee_id: "STU1005",
      phone: "9001001005",
      program: "B.Tech",
      admission_year: 2023,
      regulation: "R22.1",
      batch: "2023",
    },
    {
      name: "Vikram Singh",
      email: "vikram.singh@vignan.ac.in",
      department: "MECH",
      avatar_url: "/images/avatars/students/vikram.png",
      employee_id: "STU1006",
      phone: "9001001006",
      program: "B.Tech",
      admission_year: 2025,
      regulation: "R25",
      batch: "2025",
    },
    {
      name: "Ananya Gupta",
      email: "ananya.gupta@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/ananya.png",
      employee_id: "STU1007",
      phone: "9001001007",
      program: "B.Tech",
      admission_year: 2026,
      regulation: "R26",
      batch: "2026",
    },
    {
      name: "Karthik Rao",
      email: "karthik.rao@vignan.ac.in",
      department: "ECE",
      avatar_url: "/images/avatars/students/karthik.png",
      employee_id: "STU1008",
      phone: "9001001008",
      program: "B.Tech",
      admission_year: 2022,
      regulation: "R22",
      batch: "2022",
    },
    {
      name: "Divya Iyer",
      email: "divya.iyer@vignan.ac.in",
      department: "IT",
      avatar_url: "/images/avatars/students/divya.png",
      employee_id: "STU1009",
      phone: "9001001009",
      program: "B.Tech",
      admission_year: 2025,
      regulation: "R25",
      batch: "2025",
    },
    {
      name: "Nikhil Joshi",
      email: "nikhil.joshi@vignan.ac.in",
      department: "CSE",
      avatar_url: "/images/avatars/students/nikhil.png",
      employee_id: "STU1010",
      phone: "9001001010",
      program: "B.Tech",
      admission_year: 2026,
      regulation: "R26",
      batch: "2026",
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

  // Policies come from official Vignan PDFs via syncVignanPolicies (not mock seed text).
  store.insertNotification({
    id: store.newId(),
    user_id: null,
    role_targets: ["student", "faculty", "staff", "super_admin"],
    severity: "info",
    title: "Official Vignan policies",
    body: "Policy library syncs from https://vignan.ac.in/newvignan/policies.php — answers cite real university documents by role.",
    event_type: "new_document",
    policy_id: null,
    read: false,
    created_at: store.now(),
  });
}
