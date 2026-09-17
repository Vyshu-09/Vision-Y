import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getRememberPreference } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { dashboardPath, type Role } from "../types";

const ROLES: {
  role: Role;
  label: string;
  tile: string;
  active: string;
  email: string;
  password: string;
}[] = [
  {
    role: "student",
    label: "Student",
    tile: "border-[#93c5fd] bg-[#eff6ff] text-[#2563eb]",
    active: "border-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.28)]",
    email: "student@university.edu",
    password: "student123",
  },
  {
    role: "faculty",
    label: "Faculty",
    tile: "border-[#d8b4fe] bg-[#faf5ff] text-[#7c3aed]",
    active: "border-[#7c3aed] shadow-[0_0_0_2px_rgba(124,58,237,0.28)]",
    email: "faculty@university.edu",
    password: "faculty123",
  },
  {
    role: "staff",
    label: "Staff",
    tile: "border-[#86efac] bg-[#f0fdf4] text-[#16a34a]",
    active: "border-[#16a34a] shadow-[0_0_0_2px_rgba(22,163,74,0.28)]",
    email: "skns_it@vignan.ac.in",
    password: "staff123",
  },
  {
    role: "super_admin",
    label: "Super Admin",
    tile: "border-[#fdba74] bg-[#fff7ed] text-[#ea580c]",
    active: "border-[#ea580c] shadow-[0_0_0_2px_rgba(234,88,12,0.28)]",
    email: "kvkkishore@vignan.ac.in",
    password: "admin123",
  },
];

function RoleIcon({ role }: { role: Role }) {
  const c = "h-5 w-5";
  if (role === "student") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 10.5V16c0 1.8 2.7 3.2 6 3.2s6-1.4 6-3.2v-5.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (role === "faculty") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (role === "staff") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 18c1.2-2.4 3.2-3.6 5.5-3.6S13.3 15.6 14.5 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 18c.8-1.6 2.1-2.4 3.6-2.4 1.2 0 2.2.5 3 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m9.5 12 1.7 1.7L14.8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("student@university.edu");
  const [password, setPassword] = useState("student123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(getRememberPreference());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const offline =
        msg.includes("502") ||
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("Network request failed");
      setError(
        offline
          ? import.meta.env.PROD
            ? "Server is waking up or offline. Open https://vision-y.onrender.com/api/health, wait, then try again."
            : "Server is not reachable. Run npm run dev, then try again."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  const campusUrl = "/images/login-campus.png?v=2";
  const logoUrl = "/images/vignan-logo.png";
  const robotUrl = "/images/agent-robo-cute-clear.png";

  return (
    <div className="grid min-h-svh w-full bg-[#f4f7fb] lg:h-svh lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.98fr)] lg:overflow-hidden">
      {/* LEFT — campus + branding + bot */}
      <section className="relative hidden min-h-svh overflow-hidden lg:block">
        <img src={campusUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-transparent to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-9 xl:px-14">
          <div>
            <img src={logoUrl} alt="Vignan's" className="h-[72px] w-auto max-w-[340px] object-contain object-left drop-shadow-sm" />
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-white/70">
              <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0b2a66]">Agent 53</p>
              <span className="text-[11px] font-medium text-slate-500">· UniPolicy AI</span>
            </div>
          </div>

          <div className="flex items-end gap-6">
            <div className="max-w-lg flex-1 pb-2">
              <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tight text-slate-900 xl:text-5xl">
                Smarter Policies.
                <br />
                <span className="text-[#2563eb]">Better Decisions.</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-700">
                Your AI-powered assistant for university policies and governance.
              </p>
            </div>
            <img
              src={robotUrl}
              alt="Agent 53"
              className="animate-float-bot mb-2 h-36 w-auto shrink-0 object-contain drop-shadow-xl xl:h-44"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/agent-robo-cute.png";
              }}
            />
          </div>

          <ul className="flex max-w-2xl items-stretch overflow-hidden rounded-2xl border border-white/45 bg-white/15 text-[12px] font-semibold text-white shadow-sm backdrop-blur-md xl:text-[13px]">
            <li className="flex flex-1 items-center gap-2.5 px-3 py-3 xl:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              Official Policies Only
            </li>
            <li className="w-px self-stretch bg-white/40" aria-hidden />
            <li className="flex flex-1 items-center gap-2.5 px-3 py-3 xl:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3 5 6v5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              Trusted Information
            </li>
            <li className="w-px self-stretch bg-white/40" aria-hidden />
            <li className="flex flex-1 items-center gap-2.5 px-3 py-3 xl:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 1 0-7-7l-1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              Cited References
            </li>
          </ul>
        </div>
      </section>

      {/* RIGHT — floating card */}
      <section className="relative flex min-h-svh items-center justify-center bg-gradient-to-br from-[#eaf2fb] via-[#f7fafc] to-[#e4eef8] px-4 py-8 sm:px-8">
        <div className="absolute left-4 top-4 flex items-center gap-2 lg:hidden">
          <img src={logoUrl} alt="Vignan's" className="h-10 w-auto object-contain" />
          <img src={robotUrl} alt="" className="animate-float-bot h-10 w-10 object-contain" />
        </div>

        <div className="w-full max-w-[440px] rounded-[28px] bg-white px-8 py-8 shadow-[0_28px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80 sm:px-9 sm:py-9">
          <div className="mb-5 flex justify-end text-[12px] font-semibold tracking-wide text-[#2563eb]">
            Learn · Grow · Build
          </div>

          <div className="mb-4 h-[4px] w-14 rounded-full bg-[#2563eb]" />
          <h2 className="text-[36px] font-extrabold leading-none tracking-tight text-[#0b2a66] sm:text-[40px]">
            Welcome Back
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">Sign in to access your university dashboard</p>

          <p className="mt-7 text-[13px] font-bold text-[#0b2a66]">Select Your Role</p>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-3 text-center transition ${r.tile} ${
                  role === r.role ? r.active : "opacity-95"
                }`}
              >
                <RoleIcon role={r.role} />
                <span className="text-[10px] font-bold leading-tight sm:text-[11px]">{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-[13px] font-bold text-[#0b2a66]">
              Email Address
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block text-[13px] font-bold text-[#0b2a66]">
              Password
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M4 4l16 16M9.9 9.9A3 3 0 0 0 14 14M6.1 6.2C4.2 7.6 3 9.5 2.4 12c1 3.2 5 7 9.6 7 1.5 0 2.9-.3 4.1-.9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M2.5 12C3.6 8.8 7.4 5 12 5s8.4 3.8 9.5 7c-1.1 3.2-4.9 7-9.5 7S3.6 15.2 2.5 12Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 font-medium text-[#2563eb]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-slate-300 accent-[#2563eb]"
                />
                Remember me
              </label>
              <button type="button" className="font-semibold text-[#2563eb] hover:underline">
                Forgot password?
              </button>
            </div>

            {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#0b4ea2] py-3.5 text-[15px] font-bold text-white shadow-md shadow-blue-900/20 transition hover:bg-[#094690] disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
            Need help?{" "}
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#2563eb]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 14v-2a8 8 0 0 1 8-8h0a8 8 0 0 1 8 8v2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M6 14h2v6H6v-6Zm10 0h2v6h-2v-6Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Contact Support
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
