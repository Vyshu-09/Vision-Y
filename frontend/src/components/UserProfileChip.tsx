import { Link } from "react-router-dom";
import { useState } from "react";
import { assetUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { roleLabel } from "../types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Compact header control — opens the full My Profile page. */
export function UserProfileChip() {
  const { user } = useAuth();
  const [broken, setBroken] = useState(false);
  if (!user) return null;

  return (
    <Link
      to="/app/profile"
      className="flex max-w-[16rem] items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-left shadow-sm transition hover:border-action/40 hover:bg-canvas"
      title="My Profile"
    >
      {user.avatar_url && !broken ? (
        <img
          src={assetUrl(user.avatar_url) ?? undefined}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/50"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {initials(user.name)}
        </span>
      )}
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-sm font-semibold text-navy">{user.name.split(" ")[0]}</span>
        <span className="block truncate text-[11px] text-muted">
          {user.email}
        </span>
      </span>
      <span className="sr-only">{roleLabel(user.role)} profile</span>
    </Link>
  );
}
