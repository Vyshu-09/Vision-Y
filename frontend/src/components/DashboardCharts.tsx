import { useMemo, useState } from "react";
import type { Circular, PolicyRow } from "../types";

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#2563eb",
  superseded: "#94a3b8",
  under_review: "#3b82f6",
  draft: "#60a5fa",
  expired: "#1e3a8a",
};

const CATEGORY_PALETTE = ["#2563eb", "#3b82f6", "#1d4ed8", "#60a5fa", "#0ea5e9", "#0284c7"];

export function policyStatusSlices(policies: PolicyRow[], accent?: string): ChartSlice[] {
  const counts: Record<string, number> = {};
  for (const p of policies) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  }
  const order = ["active", "superseded", "under_review", "draft", "expired"];
  return order
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => ({
      label: k === "active" ? "Active" : k === "under_review" ? "Under review" : k.replace("_", " "),
      value: counts[k],
      color: k === "active" && accent ? accent : STATUS_COLORS[k] ?? "#64748b",
    }));
}

export function policyCategoryBars(policies: PolicyRow[], accent?: string, topN = 5): BarItem[] {
  const counts: Record<string, number> = {};
  for (const p of policies) {
    const key = p.category?.trim() || "Other";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, value], i) => ({
      label,
      value,
      color: i === 0 && accent ? accent : CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));
}

export function activeCircularCount(circulars: Circular[]): number {
  return circulars.filter((c) => c.status === "active").length;
}

export function InteractivePie({
  slices,
  size = 140,
}: {
  slices: ChartSlice[];
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size / 2;
  const inner = r * 0.52;
  const cx = r;
  const cy = r;

  const paths = useMemo(() => {
    if (total <= 0) return [];
    let angle = -90;
    return slices.map((slice, index) => {
      const sweep = (slice.value / total) * 360;
      const start = (angle * Math.PI) / 180;
      const end = ((angle + sweep) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = sweep > 180 ? 1 : 0;
      const mid = ((angle + sweep / 2) * Math.PI) / 180;
      const tipR = r * 0.72;
      angle += sweep;
      return {
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
        color: slice.color,
        label: slice.label,
        value: slice.value,
        tipX: cx + tipR * Math.cos(mid),
        tipY: cy + tipR * Math.sin(mid),
        index,
      };
    });
  }, [slices, total, cx, cy, r]);

  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  const active = hover != null ? paths[hover] : null;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pie chart">
        {paths.map((p) => (
          <path
            key={p.index}
            d={p.d}
            fill={p.color}
            opacity={hover == null || hover === p.index ? 1 : 0.35}
            className="cursor-pointer transition-opacity duration-150"
            onMouseEnter={() => setHover(p.index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <circle cx={cx} cy={cy} r={inner} fill="white" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: 18, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          TOTAL
        </text>
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
          style={{ left: active.tipX, top: active.tipY - 6 }}
        >
          {active.label}: {active.value}
        </div>
      )}
    </div>
  );
}

export function CategoryBars({ items, accent }: { items: BarItem[]; accent?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.value), 1);

  if (!items.length) {
    return <p className="text-sm text-muted">No category breakdown yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        const on = hover === i;
        return (
          <li
            key={item.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="cursor-default"
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className={`truncate font-semibold ${on ? "text-navy" : "text-slate-600"}`}>
                {item.label}
              </span>
              <span className="shrink-0 font-bold text-navy">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${pct}%`,
                  background: item.color ?? accent ?? "#2563eb",
                  opacity: hover == null || on ? 1 : 0.4,
                  transform: on ? "scaleY(1.15)" : "scaleY(1)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardInsights({
  title = "Insights",
  subtitle,
  pieTitle,
  barTitle,
  slices,
  bars,
  unread = 0,
  accent,
  extras,
}: {
  title?: string;
  subtitle?: string;
  pieTitle: string;
  barTitle: string;
  slices: ChartSlice[];
  bars: BarItem[];
  unread?: number;
  accent: string;
  extras?: { label: string; value: string | number }[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extras?.map((e) => (
            <span
              key={e.label}
              className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-navy"
            >
              {e.label}: <span style={{ color: accent }}>{e.value}</span>
            </span>
          ))}
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: accent }}
          >
            {unread} unread alert{unread === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <InteractivePie slices={slices} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{pieTitle}</p>
            {slices.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing to chart yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {slices.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="truncate">{s.label}</span>
                    <span className="ml-auto text-muted">{s.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{barTitle}</p>
          <div className="mt-3">
            <CategoryBars items={bars} accent={accent} />
          </div>
        </div>
      </div>
    </section>
  );
}
