import { categoryColor } from "@/lib/category-color";
import { daysBetween } from "@/lib/dates";
import type { EvidenceEntry } from "@/lib/queries";

/**
 * Milestones are deliberately close together at the start. The endowed
 * progress effect is the whole trick: three wins against a target of five
 * reads as "nearly there", where three against no target reads as "barely
 * started".
 */
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000, 2500];

export function nextMilestone(total: number) {
  const next = MILESTONES.find((milestone) => milestone > total) ?? null;
  const previous = [0, ...MILESTONES].filter((milestone) => milestone <= total).at(-1) ?? 0;
  return { next, previous };
}

export function MilestoneMeter({ total }: { total: number }) {
  const { next, previous } = nextMilestone(total);
  if (next === null) return null;

  const span = next - previous;
  const progress = (total - previous) / span;
  // Never render an empty track: a bar at literal zero is the discouraging
  // thing this page exists to avoid.
  const pct = Math.max(4, Math.round(progress * 100));

  return (
    <div className="mt-3">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-accent/15"
        role="img"
        aria-label={`${total} of ${next} toward the next milestone`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {next - total} more to {next}
      </p>
    </div>
  );
}

/**
 * The stack, made literal — the workbook's own metaphor. Filled blocks are
 * wins, coloured by the part of life they came from; the faint ones are the
 * room left before the next milestone, so the wall always has a shape to grow
 * into rather than trailing off into nothing.
 */
export function EvidenceStack({ entries }: { entries: EvidenceEntry[] }) {
  const total = entries.length;
  const { next } = nextMilestone(total);
  const slots = next ?? total;

  // Oldest first, so the newest win is the last block laid.
  const ordered = [...entries].sort((a, b) => a.on.localeCompare(b.on));
  const shown = ordered.slice(-slots);
  const earlier = total - shown.length;

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(0.875rem,1fr))] gap-1">
        {shown.map((entry) => (
          <span
            key={entry.id}
            title={`${entry.title} — ${entry.categoryName ?? "Uncategorised"}`}
            className="aspect-square rounded-[3px]"
            style={{ background: categoryColor(entry.categorySlot) }}
          />
        ))}
        {Array.from({ length: Math.max(0, slots - shown.length) }, (_, index) => (
          <span
            key={`empty-${index}`}
            aria-hidden
            className="aspect-square rounded-[3px] bg-foreground/8"
          />
        ))}
      </div>
      {earlier > 0 ? (
        <p className="mt-1.5 text-xs text-muted">plus {earlier} stacked earlier</p>
      ) : null}
    </div>
  );
}

/**
 * Cumulative wins over time. The point of a running total is that it cannot
 * fall — a quiet fortnight flattens the line, it never takes anything back.
 */
export function MomentumCurve({
  entries,
  today,
  days = 84,
}: {
  entries: EvidenceEntry[];
  today: string;
  days?: number;
}) {
  const width = 320;
  const height = 84;

  const perDay = new Map<number, number>();
  let before = 0;
  for (const entry of entries) {
    const offset = daysBetween(entry.on, today);
    if (offset > days) before += 1;
    else if (offset >= 0) perDay.set(days - offset, (perDay.get(days - offset) ?? 0) + 1);
  }

  const series: number[] = [];
  let running = before;
  for (let day = 0; day <= days; day++) {
    running += perDay.get(day) ?? 0;
    series.push(running);
  }

  const max = Math.max(1, series.at(-1) ?? 1);
  const min = series[0];
  // A flat line pinned to the floor looks like nothing happened; give the
  // curve headroom so even a small climb is visible.
  const span = Math.max(1, max - min);
  // The end-dot needs room or it gets sliced by the viewBox edge.
  const inset = 6;
  const x = (index: number) => inset + (index / days) * (width - inset * 2);
  const y = (value: number) => height - 4 - ((value - min) / span) * (height - 14);

  const line = series
    .map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(days)},${height} L${x(0)},${height} Z`;

  return (
    <figure className="mt-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Cumulative wins over the last ${days} days, rising from ${min} to ${max}`}
      >
        <path d={area} fill="var(--accent)" fillOpacity="0.1" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* The end-dot carries a surface ring so it stays legible over the line. */}
        <circle
          cx={x(days)}
          cy={y(max)}
          r="4"
          fill="var(--accent)"
          stroke="var(--surface)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {max - min === 0
          ? `Steady at ${max} over the last ${Math.round(days / 7)} weeks`
          : `Up ${max - min} in the last ${Math.round(days / 7)} weeks`}
      </figcaption>
    </figure>
  );
}

/**
 * Breadth, not depth. The bad-day feeling is "I'm failing at everything" —
 * seeing three parts of your life with something in them argues back.
 */
export function BreadthBar({
  entries,
  label,
}: {
  entries: EvidenceEntry[];
  label: string;
}) {
  const counts = new Map<string, { name: string; slot: number | null; count: number }>();
  for (const entry of entries) {
    const key = entry.categoryName ?? "Uncategorised";
    const row = counts.get(key) ?? { name: key, slot: entry.categorySlot, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }

  const rows = [...counts.values()].sort((a, b) => b.count - a.count);
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div>
      {/* 2px surface gaps do the separating between segments — no strokes. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {rows.map((row) => (
          <span
            key={row.name}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(row.count / total) * 100}%`, background: categoryColor(row.slot) }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: categoryColor(row.slot) }}
            />
            {row.name}
            <span className="tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
    </div>
  );
}
