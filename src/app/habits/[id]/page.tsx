import Link from "next/link";
import { notFound } from "next/navigation";

import { HeroFigure, TileRow } from "@/components/capacity";
import { HabitCalendar, HabitConsistency } from "@/components/habit-charts";
import { Screen } from "@/components/screen";
import { archiveHabit } from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { formatDay, getTimezone, todayIn } from "@/lib/dates";
import { describeRepeat, SLOT_LABEL } from "@/lib/habits";
import { getHabit } from "@/lib/queries";

export default async function HabitPage({ params }: PageProps<"/habits/[id]">) {
  const { id } = await params;
  const timeZone = await getTimezone();
  const habit = await getHabit(id, timeZone);
  if (!habit) notFound();

  const today = todayIn(timeZone);

  return (
    <Screen eyebrow={habit.categoryName ?? "Habit"} title={habit.name}>
      <Link href="/compass" className="mb-4 inline-flex min-h-11 items-center text-sm text-muted">
        ← All habits
      </Link>

      <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
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
        {habit.target_per_day > 1 ? <span>{habit.target_per_day}× a day</span> : null}
        {habit.slot !== "anytime" ? <span>{SLOT_LABEL[habit.slot]}</span> : null}
        <span>Since {formatDay(habit.started_on)}</span>
      </p>

      <HeroFigure
        value={habit.streak}
        label={habit.streak === 1 ? "day streak" : "day streak"}
        note={
          habit.streak === 0
            ? "Nowhere to go but up. One day starts it."
            : `Longest run so far: ${habit.longestStreak} ${
                habit.longestStreak === 1 ? "day" : "days"
              }.`
        }
      />

      <div className="mt-4">
        <TileRow
          tiles={[
            { label: "Days hit", value: habit.successDays },
            { label: "Days missed", value: habit.missedDays },
            { label: "Longest streak", value: habit.longestStreak },
            { label: "Consistency %", value: habit.consistencyPct },
            { label: "Times logged", value: habit.totalLogged },
            { label: "Days it asked", value: habit.scheduledDays },
          ]}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          Consistency, last 12 weeks
        </h2>
        <HabitConsistency habit={habit} today={today} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">This month</h2>
        <HabitCalendar habit={habit} today={today} />
      </section>

      <section className="mt-8">
        <form action={archiveHabit.bind(null, habit.id, habit.archived_at === null)}>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
          >
            {habit.archived_at ? "Un-archive this habit" : "Archive — keeps the history"}
          </button>
        </form>
        <p className="mt-2 px-1 text-xs text-muted text-pretty">
          Archiving stops it appearing on Today without throwing away the streak you built. Edit
          and delete live on Compass.
        </p>
      </section>
    </Screen>
  );
}
