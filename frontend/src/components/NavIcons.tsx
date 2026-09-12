import {
  Bell,
  BookOpen,
  FileText,
  Gauge,
  History,
  MessageSquareText,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "../lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: Gauge,
  chat: MessageSquareText,
  policies: BookOpen,
  circulars: FileText,
  history: History,
  notifications: Bell,
  profile: UserRound,
};

export function NavItemIcon({
  name,
  className = "h-[18px] w-[18px] shrink-0",
}: {
  name: NavIcon;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
