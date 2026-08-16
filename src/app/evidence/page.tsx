import { EmptyState, Screen } from "@/components/screen";
import { formatDay, getTimezone, recentDays, todayIn } from "@/lib/dates";
import { getEvidence } from "@/lib/queries";
import { PULL_QUOTES, TIERS } from "@/lib/workbook";

const GRID_DAYS = 56;

export default async function EvidencePage() {
  const timeZone = await getTimezone();
  const today = todayIn(timeZone);
  const entries = await getEvidence();

  const countByDay = new Map<string, number>();
  for (const entry of entries) {
    countByDay.set(entry.on, (countByDay.get(entry.on) ?? 0) + 1);
  }

  const days = recentDays(today, GRID_DAYS);
  const busiest = Math.max(1, ...days.map((day) => countByDay.get(day) ?? 0));

  const byDay = new Map<string, typeof entries>();
  for (const entry of entries) {
    byDay.set(entry.on, [...(byDay.get(entry.on) ?? []), entry]);
  }
  const dates = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <Screen
      eyebrow="Progress, not perfection"
      title="Evidence of progress"
      quote={PULL_QUOTES.progress}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-5xl tabular-nums">{entries.length}</span>
        <span className="text-sm text-muted">
          {entries.length === 1 ? "win stacked" : "wins stacked"}
        </span>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Last eight weeks
        </h2>
        {/* Columns are weeks, rows are weekdays — dense enough to read the
            shape of a habit at a glance on a phone. */}
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {days.map((day) => {
            const count = countByDay.get(day) ?? 0;
            return (
              <div
                key={day}
                title={`${formatDay(day)} — ${count} ${count === 1 ? "win" : "wins"}`}
                className="aspect-square rounded-[3px] bg-accent"
                style={{ opacity: count === 0 ? 0.08 : 0.25 + 0.75 * (count / busiest) }}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-8 space-y-5">
        {dates.length === 0 ? (
          <EmptyState
            title="Nothing stacked yet"
            body="Swipe a card right on the board, or log a habit on Today. Every one lands here."
          />
        ) : (
          dates.map((date) => (
            <div key={date}>
              <h3 className="mb-2 px-1 text-xs font-medium text-muted">{formatDay(date)}</h3>
              <ul className="space-y-1.5">
                {byDay.get(date)!.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-pretty">{entry.title}</span>
                      {entry.note ? (
                        <span className="mt-0.5 block text-xs text-muted text-pretty">
                          {entry.note}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                      {entry.kind === "finished" ? TIERS[entry.tier].label : "Logged"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        You want confidence? Stack evidence. You want change? Stack wins.
      </p>
    </Screen>
  );
}
