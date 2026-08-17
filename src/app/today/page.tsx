import Link from "next/link";

import { AddGoalForm } from "@/components/add-goal-form";
import { CategorySelect, Field, FloorCeilingFields, GoalCard } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import { deleteGoal, toggleHabitDay, updateGoal } from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { formatDay, getTimezone } from "@/lib/dates";
import { getCategories, getToday, type Labelled } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function TodayPage() {
  const timeZone = await getTimezone();
  const [{ today, atomic, horizons, later, undated }, categories] = await Promise.all([
    getToday(timeZone),
    getCategories(),
  ]);

  const parked = later.length + undated.length;

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

                <details className="px-2">
                  <summary className="inline-flex min-h-8 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
                    Edit
                  </summary>
                  <form action={updateGoal} className="mt-2 space-y-2 pb-2">
                    <input type="hidden" name="id" value={goal.id} />
                    <Field name="title" label="Habit" defaultValue={goal.title} required />
                    <Field name="detail" label="Detail" defaultValue={goal.detail ?? ""} />
                    <CategorySelect categories={categories} defaultValue={goal.category_id ?? ""} />
                    <FloorCeilingFields floor={goal.floor} ceiling={goal.ceiling} />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-medium text-accent-fg"
                      >
                        Save
                      </button>
                      <button
                        type="submit"
                        formNoValidate
                        formAction={deleteGoal.bind(null, goal.id)}
                        className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
                      >
                        Delete
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}

        <AddGoalForm
          tier="atomic"
          label="Atomic habit"
          categories={categories}
          withFloorCeiling
        />
      </section>

      {horizons.map((horizon) => (
        <section key={horizon.key} className="mt-8 space-y-2">
          <h2
            className={`flex items-baseline justify-between px-1 text-[11px] uppercase tracking-[0.16em] ${
              horizon.key === "overdue" ? "text-tier-atomic" : "text-muted"
            }`}
          >
            <span>{horizon.label}</span>
            <span className="tabular-nums">{horizon.goals.length}</span>
          </h2>
          <ul className="space-y-2">
            {horizon.goals.map((goal) => (
              <li key={goal.id}>
                <ScheduledGoal goal={goal} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {horizons.length === 0 ? (
        <p className="mt-8 px-1 text-sm text-muted text-pretty">
          Nothing is dated yet, so everything sits below. Put a target date on a micro or mini goal
          and it moves up into this week, this month, or this quarter.
        </p>
      ) : null}

      {parked > 0 ? (
        <details
          // With nothing dated yet, every horizon is empty and folding this
          // away would leave the screen blank. It opens until dates exist.
          open={horizons.length === 0}
          className="mt-8 rounded-2xl border border-dashed border-border"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm text-muted marker:hidden">
            <span>Not scheduled</span>
            <span className="tabular-nums">{parked}</span>
          </summary>
          <div className="space-y-4 border-t border-border px-4 py-3">
            {later.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted">Later</h3>
                <ul className="space-y-2">
                  {later.map((goal) => (
                    <li key={goal.id}>
                      <ScheduledGoal goal={goal} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {undated.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted">No date</h3>
                <ul className="space-y-2">
                  {undated.map((goal) => (
                    <li key={goal.id}>
                      <ScheduledGoal goal={goal} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        Bad day? You still move. One sticky worth of effort. Some days, not making things worse is a
        win.
      </p>
    </Screen>
  );
}

/**
 * Macro goals are not completed from here — they are the thing the rest
 * ladders up to, so they link through to their own screen instead.
 */
function ScheduledGoal({ goal }: { goal: Labelled }) {
  const meta = (
    <>
      {goal.categoryName ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: categoryColor(goal.categorySlot) }}
          />
          {goal.categoryName}
        </span>
      ) : null}
      {goal.target_on ? (
        <span>
          {goal.categoryName ? " · " : ""}
          {formatDay(goal.target_on)}
        </span>
      ) : null}
    </>
  );

  if (goal.tier === "macro") {
    return (
      <Link
        href={`/goal/${goal.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block leading-snug text-pretty">{goal.title}</span>
          <span className="mt-0.5 block text-xs text-muted">{meta}</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return (
    <GoalCard goal={goal}>
      {goal.categoryName ? (
        <p className="mt-1.5 text-xs text-muted">{meta}</p>
      ) : null}
    </GoalCard>
  );
}
