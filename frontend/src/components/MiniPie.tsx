/** Tiny decorative pie for dashboard stats */
export function MiniPie({
  slices,
  size = 88,
}: {
  slices: { value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let angle = -90;
  const paths: { d: string; color: string }[] = [];
  const r = size / 2;
  const cx = r;
  const cy = r;

  for (const slice of slices) {
    const sweep = (slice.value / total) * 360;
    const start = (angle * Math.PI) / 180;
    const end = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > 180 ? 1 : 0;
    paths.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      color: slice.color,
    });
    angle += sweep;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.48} fill="white" />
    </svg>
  );
}
