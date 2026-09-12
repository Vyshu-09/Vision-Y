import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getRememberPreference } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { dashboardPath, type Role } from "../types";

const ROLES: {
  role: Role;
  label: string;
  color: string;
  hint: string;
  focus: string;
  email: string;
  password: string;
}[] = [
  {
    role: "student",
    label: "Student",
    color: "border-action bg-action/10 text-action",
    hint: "Ask AI · policies · notices",
    focus: "Personal policy Q&A",
    email: "student@university.edu",
    password: "student123",
  },
  {
    role: "faculty",
    label: "Faculty",
    color: "border-action bg-action/10 text-action",
    hint: "Academic & examination rules",
    focus: "Teaching regulations",
    email: "faculty@university.edu",
    password: "faculty123",
  },
  {
    role: "staff",
    label: "Staff",
    color: "border-action bg-action/10 text-action",
    hint: "Admin · HR · operations",
    focus: "Operational procedures",
    email: "skns_it@vignan.ac.in",
    password: "staff123",
  },
  {
    role: "super_admin",
    label: "Super Admin",
    color: "border-action bg-action/10 text-action",
    hint: "Dashboard · upload · review",
    focus: "One-page governance",
    email: "kvkkishore@vignan.ac.in",
    password: "admin123",
  },
];

function RoleIcon({ role }: { role: Role }) {
  const common = "h-5 w-5";
  if (role === "student") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M6 10.5V16c0 1.8 2.7 3.2 6 3.2s6-1.4 6-3.2v-5.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (role === "faculty") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19V7l8-3 8 3v12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M4 10l8 4 8-4M9 21v-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (role === "staff") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("student@university.edu");
  const [password, setPassword] = useState("student123");
  const [remember, setRemember] = useState(getRememberPreference());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [campusOk, setCampusOk] = useState(true);

  useEffect(() => {
    const match = ROLES.find((r) => r.role === role);
    if (match) {
      setEmail(match.email);
      setPassword(match.password);
    }
  }, [role]);

  if (ready && user) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const loggedIn = await login(email, password, role, remember);
      navigate(dashboardPath(loggedIn.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(
        msg.includes("502") || msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "Server is not reachable. Make sure the API is running on port 4000, then try again."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden text-white lg:flex lg:flex-col lg:justify-between">
        {/* Background clipped separately so the logo card is never cut */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={
            campusOk
              ? {
                  backgroundImage:
                    "linear-gradient(160deg, rgba(11,42,102,0.82), rgba(11,42,102,0.55)), url(/images/login-campus.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: "linear-gradient(160deg, #0b2a66 0%, #1e4aa8 55%, #2563eb 100%)",
                }
          }
        />
        <img
          src="/images/login-campus.png"
          alt=""
          className="hidden"
          onError={() => setCampusOk(false)}
        />

        <div className="relative z-10 px-10 pt-12">
          <div className="inline-flex max-w-full items-center rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
            <img
              src="/images/vignan-logo.png"
              alt="Vignan's University"
              className="h-16 w-auto max-w-[min(100%,360px)] object-contain object-left"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-white/85">
            Knowledge <span className="text-white/40">|</span> Innovation{" "}
            <span className="text-white/40">|</span> Excellence
          </p>
        </div>
        <div className="relative z-10 px-10 pb-14">
          <h1 className="font-display text-5xl leading-tight font-medium">
            Smarter Policies.
            <br />
            Better Decisions.
          </h1>
          <p className="mt-4 max-w-md text-base text-white/85">
            Agent 53 answers from official university documents — every reply cites the source clause.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 border-t border-white/20 pt-6 text-sm font-semibold tracking-wide text-white/90">
            <span>Official Policies</span>
            <span className="text-white/35">·</span>
            <span>Trusted</span>
            <span className="text-white/35">·</span>
            <span>Cited</span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-10">
        <div className="ui-card w-full max-w-md p-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-line">
              <img
                src="/images/vignan-logo.png"
                alt="Vignan's University"
                className="h-12 w-auto max-w-[220px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <p className="font-display text-xl text-navy">Agent 53</p>
              <p className="text-xs text-muted">UniPolicy AI</p>
            </div>
          </div>

          <h2 className="font-display text-3xl text-navy">Welcome Back</h2>
          <p className="mt-1 text-sm text-muted">Choose your campus role — each portal is different.</p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  role === r.role
                    ? `${r.color} ring-2 ring-offset-1`
                    : "border-line bg-white text-navy"
                }`}
              >
                <span className="flex items-center gap-2">
                  <RoleIcon role={r.role} />
                  <p className="text-sm font-bold">{r.label}</p>
                </span>
                <p className="mt-1 text-[11px] opacity-80">{r.hint}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                  {r.focus}
                </p>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-navy">
              Email
              <input
                className="ui-input mt-1.5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium text-navy">
              Password
              <input
                className="ui-input mt-1.5"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-line"
              />
              Remember me
            </label>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button type="submit" disabled={busy} className="ui-btn ui-btn-primary w-full">
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
