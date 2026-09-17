import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  DashboardInsights,
  activeCircularCount,
  policyCategoryBars,
  policyStatusSlices,
} from "../components/DashboardCharts";
import { FOCUS_AREAS, ROLE_THEME, SUGGESTIONS } from "../lib/nav";
import type { Circular, PolicyRow, QueryRecord, Role } from "../types";
import { AdminPage } from "./Admin";

function QuickLink({
  to,
  title,
  subtitle,
  accent,
}: {
  to: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderTopWidth: 3, borderTopColor: accent }}
    >
      <p className="font-semibold text-navy group-hover:underline">{title}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
    </Link>
  );
}

function PolicyList({ policies, empty }: { policies: PolicyRow[]; empty: string }) {
  if (!policies.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {policies.map((p) => (
        <li key={p.id} className="border-b border-line pb-3 last:border-0">
          <p className="font-semibold text-navy">{p.title}</p>
          <p className="text-xs text-muted">
            {p.category} · {p.version_year} · {p.status}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CircularList({ circulars }: { circulars: Circular[] }) {
  if (!circulars.length) return <p className="text-sm text-muted">No circulars yet.</p>;
  return (
    <ul className="space-y-3">
      {circulars.map((c) => (
        <li key={c.id} className="border-b border-line pb-3 last:border-0">
          <p className="font-semibold text-navy">{c.title}</p>
          <p className="text-xs text-muted">
            {c.circular_number} · {c.issued_date}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Hero({
  name,
  theme,
}: {
  name: string;
  theme: (typeof ROLE_THEME)["student"];
}) {
  const first = name.split(" ")[0];
  return (
    <section
      className="overflow-hidden rounded-2xl border border-line text-white"
      style={{
        backgroundImage: `linear-gradient(120deg, ${theme.heroFrom}, ${theme.heroTo}), url(/images/login-campus.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between md:px-8 md:py-10">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide text-white/75">{theme.label}</p>
          <h1 className="mt-1 font-display text-3xl md:text-4xl">{name}</h1>
          <p className="mt-2 max-w-xl text-white/85">{theme.tagline}</p>

          <div className="mt-5 flex max-w-lg items-start gap-3 rounded-2xl bg-white p-3.5 text-navy shadow-lg shadow-black/20">
            <img
              src="/images/agent-robo-cute.png"
              alt="Agent 53"
              className="h-16 w-16 shrink-0 rounded-xl bg-canvas object-contain p-0.5 ring-1 ring-line"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/agent-robo.png";
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                Letter from Agent 53
              </p>
              <p className="mt-1 text-sm leading-snug text-navy/85">
                {theme.letter.replace("{name}", first)}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold">
                <Link to="/app/chat" className="hover:underline" style={{ color: theme.accent }}>
                  {theme.primaryCta} →
                </Link>
                <Link to="/app/policies" className="text-navy/60 hover:underline">
                  {theme.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <img
          src="/images/agent-robo-cute.png"
          alt=""
          className="hidden h-28 w-28 animate-float-bot rounded-2xl bg-white/90 object-contain p-1 shadow-xl ring-2 ring-white/70 lg:block"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/agent-robo.png";
          }}
        />
      </div>
    </section>
  );
}

function StudentBody({
  policies,
  circulars,
  queries,
  suggestions,
  focus,
  accent,
  unread,
}: {
  policies: PolicyRow[];
  circulars: Circular[];
  queries: QueryRecord[];
  suggestions: string[];
  focus: string[];
  accent: string;
  unread: number;
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <QuickLink to="/app/chat" title="Ask Agent" subtitle="Get a cited answer in seconds" accent={accent} />
        <QuickLink to="/app/notifications" title="Alerts" subtitle="Policy updates for students" accent={accent} />
        <QuickLink to="/app/policies" title="Policies" subtitle="Current rules you can access" accent={accent} />
      </section>

      <DashboardInsights
        title="Your policy insights"
        subtitle="Hover slices and bars to explore the catalog Agent 53 can cite."
        pieTitle="Policies by status"
        barTitle="Policies by category"
        slices={policyStatusSlices(policies, accent)}
        bars={policyCategoryBars(policies, accent)}
        unread={unread}
        accent={accent}
        extras={[
          { label: "Circulars", value: activeCircularCount(circulars) },
          { label: "My questions", value: queries.length },
        ]}
      />

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl text-navy">Ask next</h2>
        <p className="mt-1 text-sm text-muted">Common student questions powered by Agent 53.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {suggestions.map((q) => (
            <Link
              key={q}
              to="/app/chat"
              state={{ question: q }}
              className="rounded-xl border border-line px-4 py-3 text-sm font-medium text-navy transition hover:border-action hover:bg-canvas"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-navy">Recent policy updates</h2>
            <Link to="/app/circulars" className="text-sm font-semibold" style={{ color: accent }}>
              Notices
            </Link>
          </div>
          <div className="mt-4">
            <CircularList circulars={circulars.slice(0, 4)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {focus.map((f) => (
              <span
                key={f}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-navy"
                style={{ background: "rgba(37,99,235,0.08)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-navy">My recent questions</h2>
            <Link to="/app/history" className="text-sm font-semibold" style={{ color: accent }}>
              History
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {queries.slice(0, 4).map((q) => (
              <li key={q.id} className="border-b border-line pb-3 last:border-0">
                <p className="font-medium text-navy">{q.question_text}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{q.answer_text}</p>
              </li>
            ))}
            {queries.length === 0 && (
              <p className="text-sm text-muted">No questions yet — start from Ask Agent.</p>
            )}
          </ul>
          <div className="mt-4">
            <PolicyList policies={policies.filter((p) => p.status === "active").slice(0, 3)} empty="No policies." />
          </div>
        </section>
      </div>
    </>
  );
}

function FacultyBody({
  policies,
  circulars,
  suggestions,
  focus,
  accent,
  unread,
  queryCount,
}: {
  policies: PolicyRow[];
  circulars: Circular[];
  suggestions: string[];
  focus: string[];
  accent: string;
  unread: number;
  queryCount: number;
}) {
  const academic = policies.filter(
    (p) =>
      p.status === "active" &&
      /academic|attendance|exam|faculty|assessment/i.test(`${p.category} ${p.title}`),
  );
  const list = (academic.length ? academic : policies.filter((p) => p.status === "active")).slice(0, 5);

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { t: "Ask Policy AI", s: "Cited academic answers", to: "/app/chat" },
          { t: "Academic regulations", s: "Browse current rules", to: "/app/policies" },
          { t: "Examination policies", s: "Malpractice & assessment", to: "/app/policies" },
          { t: "Clarifications", s: "Student tickets to review", to: "/app/history#clarifications" },
        ].map((x) => (
          <QuickLink key={x.t} to={x.to} title={x.t} subtitle={x.s} accent={accent} />
        ))}
      </section>

      <DashboardInsights
        title="Academic insights"
        subtitle="Policy mix for teaching, exams, and faculty procedures."
        pieTitle="Policies by status"
        barTitle="Policies by category"
        slices={policyStatusSlices(policies, accent)}
        bars={policyCategoryBars(policies, accent)}
        unread={unread}
        accent={accent}
        extras={[
          { label: "Circulars", value: activeCircularCount(circulars) },
          { label: "Ask history", value: queryCount },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-xl text-navy">Faculty focus</h2>
          <p className="mt-1 text-sm text-muted">Teaching and academic procedure areas.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {focus.map((f) => (
              <span
                key={f}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-navy"
                style={{ background: "rgba(37,99,235,0.08)" }}
              >
                {f}
              </span>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Try asking</h3>
          <div className="mt-3 space-y-2">
            {suggestions.map((q) => (
              <Link
                key={q}
                to="/app/chat"
                state={{ question: q }}
                className="block rounded-xl border border-line px-4 py-3 text-sm font-medium text-navy hover:bg-canvas"
              >
                {q}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-navy">Academic policies</h2>
            <Link to="/app/policies" className="text-sm font-semibold" style={{ color: accent }}>
              Browse
            </Link>
          </div>
          <div className="mt-4">
            <PolicyList policies={list} empty="No academic policies in view." />
          </div>
          <h3 className="mt-6 font-display text-lg text-navy">Recent circulars</h3>
          <div className="mt-3">
            <CircularList circulars={circulars.slice(0, 4)} />
          </div>
        </section>
      </div>
    </>
  );
}

function StaffBody({
  policies,
  circulars,
  suggestions,
  focus,
  accent,
  active,
  superseded,
  unread,
}: {
  policies: PolicyRow[];
  circulars: Circular[];
  suggestions: string[];
  focus: string[];
  accent: string;
  active: number;
  superseded: number;
  unread: number;
}) {
  const adminish = policies.filter(
    (p) =>
      p.status === "active" &&
      /admin|hr|fee|staff|institution|governance|leave/i.test(`${p.category} ${p.title}`),
  );
  const list = (adminish.length ? adminish : policies.filter((p) => p.status === "active")).slice(0, 5);
  const circularActive = activeCircularCount(circulars);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active policies</p>
          <p className="mt-2 font-display text-3xl text-navy">{active}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Superseded</p>
          <p className="mt-2 font-display text-3xl text-navy">{superseded}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active circulars</p>
          <p className="mt-2 font-display text-3xl text-navy">{circularActive}</p>
        </div>
      </section>

      <DashboardInsights
        title="Operations insights"
        subtitle="Hover to inspect policy status and category load."
        pieTitle="Policies by status"
        barTitle="Policies by category"
        slices={policyStatusSlices(policies, accent)}
        bars={policyCategoryBars(policies, accent)}
        unread={unread}
        accent={accent}
        extras={[{ label: "Active circulars", value: circularActive }]}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { t: "Ask Policy AI", s: "Ops & admin answers", to: "/app/chat" },
          { t: "Administrative policies", s: "Procedures & HR", to: "/app/policies" },
          { t: "Circulars", s: "Operational notices", to: "/app/circulars" },
          { t: "Governance alerts", s: "Open notifications", to: "/app/notifications" },
        ].map((x) => (
          <QuickLink key={x.t} to={x.to} title={x.t} subtitle={x.s} accent={accent} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-xl text-navy">Focus areas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {focus.map((f) => (
              <span
                key={f}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-navy"
                style={{ background: "rgba(37,99,235,0.08)" }}
              >
                {f}
              </span>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Suggested ops questions</h3>
          <div className="mt-3 space-y-2">
            {suggestions.slice(0, 3).map((q) => (
              <Link
                key={q}
                to="/app/chat"
                state={{ question: q }}
                className="block rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-navy hover:bg-canvas"
              >
                {q}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-xl text-navy">Administrative policies</h2>
          <div className="mt-4">
            <PolicyList policies={list} empty="No administrative policies in view." />
          </div>
          <div className="mt-4">
            <CircularList circulars={circulars.slice(0, 3)} />
          </div>
        </section>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [p, c, h, n] = await Promise.all([
          api.policies(),
          api.circulars(),
          api.chatHistory(),
          api.notifications(),
        ]);
        if (cancelled) return;
        setPolicies(p.policies);
        setCirculars(c.circulars);
        setQueries(h.queries);
        setUnread(n.unread);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      }
    }

    void loadDashboard();
    const tick = window.setInterval(() => void loadDashboard(), 12_000);
    const onFocus = () => void loadDashboard();
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!user) return null;
  if (user.role === "super_admin") return <AdminPage section="overview" />;

  const role = user.role as Exclude<Role, "super_admin">;
  const theme = ROLE_THEME[role];
  const active = policies.filter((p) => p.status === "active").length;
  const superseded = policies.filter((p) => p.status === "superseded").length;

  let body: ReactNode;
  if (role === "student") {
    body = (
      <StudentBody
        policies={policies}
        circulars={circulars}
        queries={queries}
        suggestions={SUGGESTIONS.student}
        focus={FOCUS_AREAS.student}
        accent={theme.accent}
        unread={unread}
      />
    );
  } else if (role === "faculty") {
    body = (
      <FacultyBody
        policies={policies}
        circulars={circulars}
        suggestions={SUGGESTIONS.faculty}
        focus={FOCUS_AREAS.faculty}
        accent={theme.accent}
        unread={unread}
        queryCount={queries.length}
      />
    );
  } else {
    body = (
      <StaffBody
        policies={policies}
        circulars={circulars}
        suggestions={SUGGESTIONS.staff}
        focus={FOCUS_AREAS.staff}
        accent={theme.accent}
        active={active}
        superseded={superseded}
        unread={unread}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Hero name={user.name} theme={theme} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {body}
    </div>
  );
}
