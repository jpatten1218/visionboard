import { AddGoalForm } from "@/components/add-goal-form";
import { GoalCard } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import { toggleHabitDay } from "@/lib/actions";
import { formatDay, getTimezone } from "@/lib/dates";
import { getToday } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function TodayPage() {
  const timeZone = await getTimezone();
  const { today, atomic, minis } = await getToday(timeZone);

  return (
    <Screen eyebrow={formatDay(today)} title="Your floor is what saves you." quote={PULL_QUOTES.floor}>
      <section className="space-y-3">
        <h2 className="px-1 text-[11px] uppercase tracking-[0.16em] text-tier-atomic">
          Atomic — non-negotiables
        </h2>

        {atomic.length === 0 ? (
          <EmptyState
            title="No non-negotiables yet"
            body="Two minutes or less. A gallon of water, a ten-minute walk, five minutes of breathwork."
          />
        ) : (
          <ul className="space-y-2">
            {atomic.map((goal) => (
              <li key={goal.id}>
                <form action={toggleHabitDay.bind(null, goal.id, today, false)}>
                  <button
                    type="submit"
                    aria-pressed={goal.doneToday}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                      goal.doneToday
                        ? "border-emerald-600/40 bg-emerald-600/10"
                        : "border-border bg-surface"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                        goal.doneToday
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-border"
                      }`}
                    >
                      {goal.doneToday ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l4 4L19 7" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug text-pretty">{goal.title}</span>
                      {goal.floor ? (
                        <span className="mt-0.5 block text-xs text-muted">Floor: {goal.floor}</span>
                      ) : null}
                    </span>
                    {goal.streak > 0 ? (
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {goal.streak}d
                      </span>
                    ) : null}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AddGoalForm tier="atomic" label="Atomic habit" withFloorCeiling />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="px-1 text-[11px] uppercase tracking-[0.16em] text-tier-mini">
          Mini — today&apos;s actions
        </h2>
        {minis.length === 0 ? (
          <EmptyState
            title="Nothing queued"
            body="Mini goals live under a micro goal on the board. Add them there and they show up here."
          />
        ) : (
          <ul className="space-y-2">
            {minis.map((goal) => (
              <li key={goal.id}>
                <GoalCard goal={goal} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        Bad day? You still move. One sticky worth of effort. Some days, not making things worse is a
        win.
      </p>
    </Screen>
  );
}
