import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { roleLabel } from "../types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  if (!user) return null;

  const isStudent = user.role === "student";
  const idLabel = isStudent ? "Student ID" : "Employee ID";
  const portalId =
    user.employee_id ??
    `DEMO-${(user.department ?? user.role).replace(/\s+/g, "").toUpperCase()}-${user.email.split("@")[0]}`;

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const { user: updated } = await api.uploadAvatar(file);
      setUser(updated);
      setBroken(false);
      setMsg("Photo updated");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setMsg(null);
    try {
      const { user: updated } = await api.removeAvatar();
      setUser(updated);
      setBroken(false);
      setMsg("Photo removed");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  const accountFields: { label: string; value: string }[] = [
    { label: "Role", value: roleLabel(user.role).toUpperCase() },
    { label: "Email", value: user.email },
    { label: idLabel, value: user.employee_id ?? "—" },
    { label: isStudent ? "Student portal ID" : "Faculty / staff ID", value: portalId },
    { label: "Phone", value: user.phone ?? "—" },
    { label: "Department", value: user.department ?? "—" },
    { label: "Designation", value: user.designation ?? roleLabel(user.role) },
    { label: "Qualification", value: "—" },
    {
      label: isStudent ? "Programme focus" : "Specialization",
      value: user.department ? `${user.department} · UniPolicy AI access` : "—",
    },
    { label: "Joining date", value: "—" },
    { label: "Employment type", value: isStudent ? "Enrolled student" : "University staff" },
    { label: "Data source", value: "DEMO / UniPolicy seed" },
    {
      label: isStudent ? "Additional branches" : "Additional departments",
      value: "—",
    },
    {
      label: isStudent ? "Advisor notes" : "Administrative roles",
      value: user.role === "super_admin" ? "Governance · Policy control" : "—",
    },
    {
      label: isStudent ? "Campus interests" : "Research interests",
      value: user.department ? `${user.department} policies & circulars` : "—",
    },
    {
      label: isStudent ? "Academic status" : "Academic experience",
      value: "As recorded in university directory",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your account details. Role and department cannot be changed here.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-start">
            {user.avatar_url && !broken ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-28 w-28 rounded-full object-cover ring-1 ring-slate-200"
                onError={() => setBroken(true)}
              />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600 ring-1 ring-slate-200">
                {initials(user.name)}
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              title="Change photo"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Name is managed by the university directory"
                disabled
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {user.designation ?? roleLabel(user.role)}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={busy || !user.avatar_url}
                onClick={() => void removePhoto()}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove photo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? "Working…" : "Upload photo"}
              </button>
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-8">
          <h3 className="text-lg font-bold text-slate-900">Account</h3>
          <dl className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {accountFields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} />
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
