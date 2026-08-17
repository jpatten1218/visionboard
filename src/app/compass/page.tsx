import Link from "next/link";

import { AddGoalForm } from "@/components/add-goal-form";
import { HabitForm } from "@/components/habit-form";
import { CategorySelect, Field, FloorCeilingFields } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import {
  addCategory,
  deleteCategory,
  deleteGoal,
  deleteHabit,
  renameCategory,
  saveWeeklyReview,
  updateGoal,
} from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { formatDay, getTimezone } from "@/lib/dates";
import { describeRepeat, SLOT_LABEL } from "@/lib/habits";
import { getCategories, getHabits, getToday, getUniversalGoals, getWeek } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function CompassPage() {
  const timeZone = await getTimezone();
  const [universal, week, categories, { atomic }, habits] = await Promise.all([
    getUniversalGoals(),
    getWeek(timeZone),
    getCategories(),
    getToday(timeZone),
    getHabits(timeZone),
  ]);

  return (
    <Screen eyebrow="Part 01" title="Define your direction" quote={PULL_QUOTES.direction}>
      <section>
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-tier-universal">
          Universal goals — your compass
        </h2>
        <ul className="space-y-2">
          {universal.map((goal) => (
            <li key={goal.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
              <p className="leading-snug text-pretty">{goal.title}</p>
              {goal.detail ? (
                <p className="mt-1 text-sm text-muted text-pretty">{goal.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-muted text-pretty">
          These aren&apos;t checkboxes — they are directions. You don&apos;t finish them. You live
          them.
        </p>
        <div className="mt-3">
          <AddGoalForm tier="universal" label="Universal goal" />
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-tier-atomic">
          Non-negotiables
        </h2>
        <p className="mb-3 px-1 text-xs text-muted text-pretty">
          Your daily floor. These appear at the top of Today every morning — two minutes or less,
          the things you do even on the days you have nothing.
        </p>

        {atomic.length === 0 ? (
          <EmptyState
            title="No non-negotiables yet"
            body="A gallon of water, a ten-minute walk, five minutes of breathwork. Small enough that a bad day can't stop you."
          />
        ) : (
          <ul className="space-y-2">
            {atomic.map((habit) => (
              <li key={habit.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 leading-snug text-pretty">{habit.title}</p>
                  {habit.streak > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {habit.streak}d
                    </span>
                  ) : null}
                </div>

                {habit.categoryName || habit.floor || habit.ceiling ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {habit.categoryName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ background: categoryColor(habit.categorySlot) }}
                        />
                        {habit.categoryName}
                      </span>
                    ) : null}
                    {habit.floor ? <span>Floor: {habit.floor}</span> : null}
                    {habit.ceiling ? <span>Ceiling: {habit.ceiling}</span> : null}
                  </div>
                ) : null}

                <details className="mt-2">
                  <summary className="inline-flex min-h-8 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
                    Edit
                  </summary>
                  <form action={updateGoal} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={habit.id} />
                    <Field name="title" label="Habit" defaultValue={habit.title} required />
                    <Field name="detail" label="Detail" defaultValue={habit.detail ?? ""} />
                    <CategorySelect
                      categories={categories}
                      defaultValue={habit.category_id ?? ""}
                    />
                    <FloorCeilingFields floor={habit.floor} ceiling={habit.ceiling} />
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
                        formAction={deleteGoal.bind(null, habit.id)}
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

        <div className="mt-3">
          <AddGoalForm
            tier="atomic"
            label="Non-negotiable"
            categories={categories}
            withFloorCeiling
          />
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">Habits</h2>
        <p className="mb-3 px-1 text-xs text-muted text-pretty">
          Separate from the floor. A habit can run on chosen days and ask for more than one rep,
          and missing one doesn&apos;t mean the floor gave way. They appear on Today underneath
          your non-negotiables.
        </p>

        {habits.length === 0 ? (
          <EmptyState
            title="No habits yet"
            body="Reading, cold plunge, an evening walk — anything you want to build and measure without it being a non-negotiable."
          />
        ) : (
          <ul className="space-y-2">
            {habits.map((habit) => (
              <li key={habit.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-start gap-3">
                  <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1">
                    <span className="block leading-snug text-pretty">{habit.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      {habit.categoryName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ background: categoryColor(habit.categorySlot) }}
                          />
                          {habit.categoryName}
                        </span>
                      ) : null}
                      <span>{describeRepeat(habit)}</span>
                      {habit.target_per_day > 1 ? <span>{habit.target_per_day}×/day</span> : null}
                      {habit.slot !== "anytime" ? <span>{SLOT_LABEL[habit.slot]}</span> : null}
                    </span>
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm tabular-nums">{habit.streak}d</span>
                    <span className="block text-[10px] text-muted">streak</span>
                  </span>
                </div>

                <details className="mt-2">
                  <summary className="inline-flex min-h-8 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
                    Edit
                  </summary>
                  <div className="mt-2 space-y-3">
                    <HabitForm categories={categories} habit={habit} />
                    <form action={deleteHabit.bind(null, habit.id)}>
                      <button
                        type="submit"
                        className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
                      >
                        Delete habit and its history
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3 rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Add a habit
          </summary>
          <div className="border-t border-border px-4 py-3">
            <HabitForm categories={categories} />
          </div>
        </details>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Part 05 — this week
        </h2>
        <div className="rounded-2xl border border-border bg-surface px-4 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{week.consistencyPct}%</span>
            <span className="text-sm text-muted">consistent since {formatDay(week.weekStart)}</span>
          </div>

          {week.perGoal.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {week.perGoal.map(({ goal, days }) => (
                <li key={goal.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{goal.title}</span>
                  <span className="flex shrink-0 gap-1">
                    {week.days.map((day) => (
                      <span
                        key={day}
                        title={formatDay(day)}
                        className={`h-4 w-4 rounded-[3px] ${
                          days.has(day) ? "bg-accent" : "bg-surface-sunk"
                        }`}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted text-pretty">
              Tick your non-negotiables on Today and this fills in.
            </p>
          )}

          <form action={saveWeeklyReview} className="mt-4">
            <input type="hidden" name="week_start" value={week.weekStart} />
            <textarea
              name="note"
              defaultValue={week.review?.note ?? ""}
              rows={2}
              placeholder="Skipped Friday, subbed walks."
              className="w-full resize-y rounded-xl border border-border bg-surface-sunk px-3 py-2 outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="mt-2 min-h-11 w-full rounded-xl border border-border text-sm"
            >
              Save this week&apos;s note
            </button>
          </form>

          <p className="mt-3 text-xs text-muted text-pretty">
            If you were 50% consistent this week, celebrate it. Then aim for 55%.
          </p>
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">Categories</h2>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id} className="rounded-2xl border border-border bg-surface px-3 py-2">
              <form action={renameCategory.bind(null, category.id)} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: categoryColor(category.color_slot) }}
                />
                <input
                  name="name"
                  defaultValue={category.name}
                  aria-label={`Rename ${category.name}`}
                  className="min-h-11 min-w-0 flex-1 rounded-xl bg-transparent px-1 outline-none focus:bg-surface-sunk"
                />
                <button type="submit" className="min-h-11 px-2 text-xs text-muted">
                  Save
                </button>
                <button
                  type="submit"
                  formNoValidate
                  formAction={deleteCategory.bind(null, category.id)}
                  aria-label={`Remove ${category.name}`}
                  className="min-h-11 px-2 text-muted"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-muted text-pretty">
          Removing a category leaves its goals on the board — they just lose the label. The board
          groups itself by this order.
        </p>

        <details className="mt-3 rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Add a category
          </summary>
          <form action={addCategory} className="space-y-2 border-t border-border px-4 py-3">
            <Field name="name" label="Name" required placeholder="Craft" />
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
            >
              Add
            </button>
          </form>
        </details>
      </section>

      <p className="mt-9 border-l-2 border-accent pl-3 text-sm italic text-muted text-pretty">
        {PULL_QUOTES.responsibility}
      </p>
      <p className="mt-4 px-1 font-serif text-xl">You&apos;re not dead yet. So live like it.</p>
    </Screen>
  );
}
