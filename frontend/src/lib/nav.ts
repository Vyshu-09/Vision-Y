import type { Role } from "../types";

export type NavIcon =
  | "dashboard"
  | "chat"
  | "policies"
  | "circulars"
  | "history"
  | "notifications"
  | "profile"
  | "upload"
  | "manage"
  | "review"
  | "versions"
  | "conflicts"
  | "flags"
  | "clarifications";

export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
}

/** Same shell for every role: Dashboard first; Profile last like Agent 58. */
export function navForRole(role: Role): NavItem[] {
  const sharedTail: NavItem[] = [
    { label: "Notifications", to: "/app/notifications", icon: "notifications" },
    { label: "Profile", to: "/app/profile", icon: "profile" },
  ];

  switch (role) {
    case "super_admin":
      return [
        { label: "Dashboard", to: "/app/dashboard", icon: "dashboard" },
        { label: "Upload", to: "/app/admin/upload", icon: "upload" },
        { label: "Manage policies", to: "/app/admin/manage", icon: "manage" },
        { label: "Review", to: "/app/admin/review", icon: "review" },
        { label: "Versions", to: "/app/admin/versions", icon: "versions" },
        { label: "Conflicts", to: "/app/admin/conflicts", icon: "conflicts" },
        { label: "Flags", to: "/app/admin/flags", icon: "flags" },
        { label: "Clarifications", to: "/app/admin/clarifications", icon: "clarifications" },
        { label: "Library", to: "/app/policies", icon: "policies" },
        ...sharedTail,
      ];
    default:
      return [
        { label: "Dashboard", to: "/app/dashboard", icon: "dashboard" },
        { label: "Ask AI", to: "/app/chat", icon: "chat" },
        { label: "Policies", to: "/app/policies", icon: "policies" },
        { label: "Circulars", to: "/app/circulars", icon: "circulars" },
        { label: "History", to: "/app/history", icon: "history" },
        ...sharedTail,
      ];
  }
}

export const SUGGESTIONS: Record<Exclude<Role, "super_admin">, string[]> = {
  student: [
    "Can I get attendance condonation?",
    "What is the minimum CGPA for promotion?",
    "How do I apply for a leave of absence?",
    "What are hostel entry timings?",
  ],
  faculty: [
    "What is the procedure for approving attendance?",
    "What is the examination malpractice policy?",
    "How are continuous assessment marks calculated?",
    "Which circulars affect attendance rules?",
  ],
  staff: [
    "What is the current procedure for leave approval?",
    "What documents are required for fee refunds?",
    "How are circulars linked to active policies?",
    "Which policies are currently under review?",
  ],
};

export const FOCUS_AREAS: Record<Exclude<Role, "super_admin">, string[]> = {
  student: ["Attendance", "Examinations", "Fees", "Hostel"],
  faculty: ["Academic regulations", "Examination", "Attendance procedures", "Faculty rules"],
  staff: ["Administrative", "HR / Leave", "Fees", "Governance circulars"],
};

export interface RoleTheme {
  accent: string;
  accentSoft: string;
  heroFrom: string;
  heroTo: string;
  label: string;
  tagline: string;
  letter: string;
  primaryCta: string;
  secondaryCta: string;
}

/** Shared blue–white theme for every role (campus UI). */
const SHARED_THEME = {
  accent: "#2563eb",
  accentSoft: "rgba(37, 99, 235, 0.12)",
  heroFrom: "rgba(11, 42, 102, 0.92)",
  heroTo: "rgba(37, 99, 235, 0.78)",
} as const;

export const ROLE_THEME: Record<Exclude<Role, "super_admin">, RoleTheme> = {
  student: {
    ...SHARED_THEME,
    label: "Student portal",
    tagline: "Ask about attendance, exams, fees, and campus rules — with exact clause citations.",
    letter:
      "Hi {name} — ask me anything about student policies. I’ll answer only from official documents.",
    primaryCta: "Ask Policy AI",
    secondaryCta: "My policies",
  },
  faculty: {
    ...SHARED_THEME,
    label: "Faculty portal",
    tagline: "Academic regulations, examination policies, and faculty procedures in one place.",
    letter:
      "Hi {name} — I focus on teaching, assessment, and faculty regulations. Ask with the clause you need.",
    primaryCta: "Ask academic AI",
    secondaryCta: "Academic policies",
  },
  staff: {
    ...SHARED_THEME,
    label: "Staff portal",
    tagline: "Administrative, HR, and operational policies for day-to-day campus work.",
    letter:
      "Hi {name} — I help with administrative procedures, leave, fees workflows, and institutional circulars.",
    primaryCta: "Ask operations AI",
    secondaryCta: "Admin policies",
  },
};
