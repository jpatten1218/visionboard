import { AddGoalForm } from "@/components/add-goal-form";
import { CategorySelect, Field, FloorCeilingFields, GoalCard } from "@/components/goal-card";
import { HabitRow } from "@/components/habit-row";
import { EmptyState, Screen } from "@/components/screen";
import {
  deleteGoal,
  planForDay,
  toggleHabitDay,
  unplanGoal,
  updateGoal,
} from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { countdown, formatDay, getTimezone } from "@/lib/dates";
import { getCategories, getHabits, getToday, type Labelled } from "@/lib/queries";

/**
 * Three or four things is a day's work. More than that is a wish list, and
 * the number is here to make over-committing visible rather than to block it.
 */
const COMMITMENT_GUIDE = 3;

export default async function TodayPage() {
  const timeZone = await getTimezone();
  const [{ today, atomic, committed, carried, candidates, movedToday }, categories, habits] =
    await Promise.all([getToday(timeZone), getCategories(), getHabits(timeZone)]);

  // Habits sit under the floor: they are built and measured, not sworn to.
  const dueHabits = habits.filter((habit) => habit.dueToday);
  const habitsDone = dueHabits.filter((habit) => habit.doneToday).length;

  const floorDone = atomic.filter((goal) => goal.doneToday).length;

  return (
    <Screen eyebrow={formatDay(today)} title="Run the day.">
      <ol className="space-y-9">
        <Step
          n={1}
          title="Your floor"
          note={
            atomic.length === 0
              ? undefined
              : `${floorDone} of ${atomic.length} done — this is what saves the bad days`
          }
        >
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
                      <Tick on={goal.doneToday} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug text-pretty">{goal.title}</span>
                        {goal.floor ? (
                          <span className="mt-0.5 block text-xs text-muted">
                            Floor: {goal.floor}
                          </span>
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
                      <CategorySelect
                        categories={categories}
                        defaultValue={goal.category_id ?? ""}
                      />
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

          <div className="mt-2">
            <AddGoalForm
              tier="atomic"
              label="Atomic habit"
              categories={categories}
              withFloorCeiling
            />
          </div>

          {dueHabits.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                Habits — {habitsDone} of {dueHabits.length}
              </h3>
              <ul className="space-y-2">
                {dueHabits.map((habit) => (
                  <li key={habit.id}>
                    <HabitRow habit={habit} today={today} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Step>

        <Step
          n={2}
          title="Today's work"
          note={
            committed.length === 0
              ? "Nothing chosen yet — pick from the board below"
              : `${committed.length} chosen${
                  committed.length > COMMITMENT_GUIDE ? " — that's a lot for one day" : ""
                }`
          }
        >
          {committed.length > 0 ? (
            <ul className="space-y-2">
              {committed.map((goal) => (
                <li key={goal.id}>
                  <GoalCard goal={goal}>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <Meta goal={goal} today={today} />
                      <form action={unplanGoal.bind(null, goal.id)}>
                        <button type="submit" className="min-h-8 shrink-0 text-xs text-muted">
                          Put back
                        </button>
                      </form>
                    </div>
                  </GoalCard>
                </li>
              ))}
            </ul>
          ) : null}

          {carried.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-border bg-surface-sunk px-4 py-3">
              <p className="text-sm text-pretty">
                {carried.length} {carried.length === 1 ? "thing" : "things"} you picked earlier and
                didn&apos;t finish. Not a failure — decide again.
              </p>
              <ul className="mt-2 space-y-1.5">
                {carried.map((goal) => (
                  <li key={goal.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm text-pretty">{goal.title}</span>
                    <form action={planForDay.bind(null, goal.id, today)}>
                      <button
                        type="submit"
                        className="min-h-9 shrink-0 rounded-lg border border-border px-3 text-xs"
                      >
                        Today
                      </button>
                    </form>
                    <form action={unplanGoal.bind(null, goal.id)}>
                      <button type="submit" className="min-h-9 shrink-0 px-2 text-xs text-muted">
                        Drop
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details open={committed.length === 0} className="mt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-2xl border border-dashed border-border px-4 text-sm text-muted marker:hidden">
              + Pull from the board
            </summary>
            <div className="mt-3 space-y-5">
              {candidates.length === 0 ? (
                <p className="px-1 text-sm text-muted text-pretty">
                  Nothing to pull. Add micro and mini goals under a macro goal on the board and
                  they show up here.
                </p>
              ) : (
                candidates.map((group) => (
                  <div key={group.key}>
                    <h3
                      className={`mb-2 px-1 text-[11px] uppercase tracking-[0.16em] ${
                        group.key === "overdue" ? "text-tier-atomic" : "text-muted"
                      }`}
                    >
                      {group.label}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.goals.map((goal) => (
                        <li
                          key={goal.id}
                          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm leading-snug text-pretty">
                              {goal.title}
                            </span>
                            <Meta goal={goal} today={today} />
                          </span>
                          <form action={planForDay.bind(null, goal.id, today)}>
                            <button
                              type="submit"
                              aria-label={`Pull ${goal.title} onto today`}
                              className="min-h-9 shrink-0 rounded-lg bg-accent px-3 text-xs font-medium text-accent-fg"
                            >
                              Today
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </details>
        </Step>

        <Step
          n={3}
          title="Close the day"
          note={
            movedToday.length === 0
              ? "Nothing logged yet"
              : `${movedToday.length} ${movedToday.length === 1 ? "thing" : "things"} moved today`
          }
        >
          {movedToday.length === 0 ? (
            <p className="px-1 text-sm text-muted text-pretty">
              Bad day? You still move. One sticky worth of effort. Some days, not making things
              worse is a win.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {movedToday.map((entry) => (
                <li
                  key={`${entry.kind}-${entry.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-2.5"
                >
                  <Tick on />
                  <span className="min-w-0 flex-1 text-sm text-pretty">{entry.title}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 px-1 text-xs text-muted text-pretty">
            Everything here is already stacked on Evidence. Add anything else that happened there.
          </p>
        </Step>
      </ol>
    </Screen>
  );
}

function Step({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <div className="mb-3 flex items-baseline gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunk text-xs tabular-nums text-muted">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-xl leading-none">{title}</h2>
          {note ? <p className="mt-1 text-xs text-muted text-pretty">{note}</p> : null}
        </div>
      </div>
      {children}
    </li>
  );
}

function Meta({ goal, today }: { goal: Labelled; today: string }) {
  const clock = goal.target_on ? countdown(goal.target_on, today) : null;
  if (!goal.categoryName && !clock) return null;

  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
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
      {clock ? <span className={clock.overdue ? "text-tier-atomic" : ""}>{clock.label}</span> : null}
    </span>
  );
}

function Tick({ on, size = "sm" }: { on: boolean; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      aria-hidden
      className={`grid ${box} shrink-0 place-items-center rounded-full border-2 ${
        on ? "border-emerald-600 bg-emerald-600 text-white" : "border-border"
      }`}
    >
      {on ? (
        <svg
          viewBox="0 0 24 24"
          className={size === "lg" ? "h-4 w-4" : "h-3 w-3"}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l4 4L19 7" />
        </svg>
      ) : null}
    </span>
  );
}
