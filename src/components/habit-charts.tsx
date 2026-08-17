import { formatDay, recentDays } from "@/lib/dates";
import { DAY_NAMES, isDueOn } from "@/lib/habits";
import type { HabitView } from "@/lib/queries";

/**
 * A rolling hit-rate over the days the habit actually asked for. It is drawn
 * as a line rather than a bar chart because the question is which way the
 * trend is going, not what any single day was.
 */
export function HabitConsistency({ habit, today }: { habit: HabitView; today: string }) {
  const width = 320;
  const height = 90;
  const days = recentDays(today, 84).filter((day) => day >= habit.started_on);
  const hit = new Set(habit.loggedDates);

  // Rolling 14-day window, so one bad week bends the line instead of erasing it.
  const points: { day: string; pct: number }[] = [];
  for (let index = 0; index < days.length; index++) {
    const window = days.slice(Math.max(0, index - 13), index + 1).filter((d) => isDueOn(habit, d));
    if (window.length === 0) continue;
    const met = window.filter((d) => hit.has(d)).length;
    points.push({ day: days[index], pct: (met / window.length) * 100 });
  }

  if (points.length < 2) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted text-pretty">
        Not enough history yet. A few more days and the trend shows up here.
      </p>
    );
  }

  const inset = 6;
  const x = (index: number) =>
    inset + (index / (points.length - 1)) * (width - inset * 2);
  const y = (pct: number) => height - 6 - (pct / 100) * (height - 16);

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.pct).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1)},${height} L${x(0)},${height} Z`;
  const current = Math.round(points.at(-1)!.pct);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rolling consistency, currently ${current} percent`}
      >
        {/* One hairline at 100% gives the curve something to be measured against. */}
        <line
          x1={inset}
          x2={width - inset}
          y1={y(100)}
          y2={y(100)}
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
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
        <circle
          cx={x(points.length - 1)}
          cy={y(points.at(-1)!.pct)}
          r="4"
          fill="var(--accent)"
          stroke="var(--surface)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-xs text-muted">
        <span>{formatDay(points[0].day)}</span>
        <span className="text-foreground">now · {current}%</span>
      </div>
      <figcaption className="mt-1.5 text-xs text-muted text-pretty">
        Share of the last fourteen due days you hit, tracked forward. A rough week bends it; it
        recovers as soon as you do.
      </figcaption>
    </figure>
  );
}

/** The month at a glance: hit, missed, or never asked. */
export function HabitCalendar({ habit, today }: { habit: HabitView; today: string }) {
  const [year, month] = today.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const hit = new Set(habit.loggedDates);

  const cells: ({ iso: string; day: number } | null)[] = [];
  // Blank leading cells so the first of the month lands on its weekday.
  for (let i = 0; i < firstOfMonth.getUTCDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, day });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {DAY_NAMES.map((name) => (
          <div key={name}>{name.slice(0, 1)}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`pad-${index}`} />;
          const done = hit.has(cell.iso);
          const due = isDueOn(habit, cell.iso);
          const future = cell.iso > today;

          return (
            <div
              key={cell.iso}
              title={`${formatDay(cell.iso)} — ${done ? "done" : due && !future ? "missed" : "not due"}`}
              className={`grid aspect-square place-items-center rounded-lg text-[11px] tabular-nums ${
                done
                  ? "bg-accent text-accent-fg"
                  : future || !due
                    ? "text-muted/40"
                    : "border border-tier-atomic/30 text-tier-atomic"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted text-pretty">
        Filled is done, outlined is a day it asked and you missed, faded is a day it never asked
        for.
      </p>
    </div>
  );
}
