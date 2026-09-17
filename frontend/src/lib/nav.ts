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
        { label: "Ask Agent", to: "/app/chat", icon: "chat" },
        { label: "Policies", to: "/app/policies", icon: "policies" },
        { label: "Circulars", to: "/app/circulars", icon: "circulars" },
        { label: "History", to: "/app/history", icon: "history" },
        ...sharedTail,
      ];
  }
}

export const SUGGESTIONS: Record<Exclude<Role, "super_admin">, string[]> = {
  student: [
    "What does the student code of conduct require?",
    "How do scholarships work at Vignan?",
    "How do I raise a student grievance?",
    "What is the admission policy?",
  ],
  faculty: [
    "What is in the faculty code of conduct?",
    "What are the service rules for faculty?",
    "Summarize the research policy",
    "What does the consultancy policy cover?",
  ],
  staff: [
    "What do the service rules say for staff?",
    "What is the financial policy?",
    "How does the maintenance policy work?",
    "What does the e-governance framework cover?",
  ],
};

export const FOCUS_AREAS: Record<Exclude<Role, "super_admin">, string[]> = {
  student: ["Code of conduct", "Scholarships", "Grievance", "Admissions"],
  faculty: ["Faculty conduct", "Service rules", "Research", "Consultancy"],
  staff: ["Service rules", "Finance", "Facilities", "E-governance"],
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
    tagline: "Official Vignan student policies — conduct, scholarships, grievance, and more.",
    letter:
      "Hi {name} — ask me anything about student policies. I’ll answer only from official Vignan documents.",
    primaryCta: "Ask Policy AI",
    secondaryCta: "My policies",
  },
  faculty: {
    ...SHARED_THEME,
    label: "Faculty portal",
    tagline: "Faculty conduct, service rules, research, and academic policy documents.",
    letter:
      "Hi {name} — I focus on faculty regulations and academic policy. Ask with the clause you need.",
    primaryCta: "Ask academic AI",
    secondaryCta: "Academic policies",
  },
  staff: {
    ...SHARED_THEME,
    label: "Staff portal",
    tagline: "Service rules, finance, facilities, and e-governance policies for campus operations.",
    letter:
      "Hi {name} — I help with staff procedures and institutional policies from official Vignan PDFs.",
    primaryCta: "Ask operations AI",
    secondaryCta: "Admin policies",
  },
};
