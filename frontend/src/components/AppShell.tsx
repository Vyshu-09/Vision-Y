import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { navForRole, type NavItem } from "../lib/nav";
import { roleLabel, type Role } from "../types";
import { NavItemIcon } from "./NavIcons";
import { NotificationBell } from "./NotificationBell";
import { UserProfileChip } from "./UserProfileChip";

const ROLE_ACCENT: Record<Role, string> = {
  student: "var(--color-action)",
  faculty: "var(--color-action)",
  staff: "var(--color-action)",
  super_admin: "var(--color-action)",
};

function isItemActive(item: NavItem, pathname: string, hash: string): boolean {
  const [path, itemHash] = item.to.split("#");
  if (itemHash) {
    return pathname === path && hash === `#${itemHash}`;
  }
  if (pathname !== path) return false;
  if (path === "/app/history" && hash === "#clarifications") return false;
  return true;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const items = navForRole(user.role);
  const accent = ROLE_ACCENT[user.role];

  return (
    <div className="ui-shell flex min-h-svh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-[#f3f4f6] md:flex">
        <div className="border-b border-line bg-white px-4 py-4">
          <img
            src="/images/vignan-logo.png"
            alt="Vignan's University"
            className="h-11 w-auto max-w-full object-contain object-left"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-navy">Agent 53</p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">UniPolicy AI · {roleLabel(user.role)}</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2.5 py-3">
          {items.map((item) => {
            const active = isItemActive(item, location.pathname, location.hash);
            return (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-navy"
                }`}
                style={
                  active
                    ? { boxShadow: `inset 3px 0 0 ${accent}` }
                    : undefined
                }
              >
                <NavItemIcon
                  name={item.icon}
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-navy" : "text-slate-500"}`}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-line bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: accent }}
              >
                {user.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-ghost mt-3 w-full text-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 md:px-6">
          <div className="md:hidden">
            <p className="font-display text-base text-navy">Agent 53</p>
            <p className="text-[11px] font-semibold" style={{ color: accent }}>
              {roleLabel(user.role)}
            </p>
          </div>
          <div className="hidden text-sm font-semibold tracking-wide text-navy md:block">
            AGENT 53 <span className="font-normal text-muted">|</span> UNIPOLICY AI
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <UserProfileChip />
            <button
              type="button"
              className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-ink"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <div className="md:hidden overflow-x-auto border-b border-line bg-[#f3f4f6] px-3 py-2">
          <div className="flex gap-1.5">
            {items.map((item) => {
              const active = isItemActive(item, location.pathname, location.hash);
              return (
                <NavLink
                  key={`m-${item.to}-${item.label}`}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    active ? "bg-white text-navy shadow-sm" : "text-slate-600"
                  }`}
                  style={active ? { boxShadow: `inset 0 -2px 0 ${accent}` } : undefined}
                >
                  <NavItemIcon name={item.icon} className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        <main className="page-enter flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
