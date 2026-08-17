import Link from "next/link";

import { stepHabitLog } from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import type { HabitView } from "@/lib/queries";
import { SLOT_LABEL } from "@/lib/habits";

/**
 * One tap steps the count. A habit asking for a single rep toggles; one asking
 * for several counts up and wraps back to zero past the target, so a mis-tap
 * costs two taps rather than needing a separate control.
 */
export function HabitRow({ habit, today }: { habit: HabitView; today: string }) {
  const done = habit.doneToday;
  const partial = habit.todayCount > 0 && !done;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border ${
        done ? "border-emerald-600/40 bg-emerald-600/10" : "border-border bg-surface"
      }`}
    >
      <form action={stepHabitLog.bind(null, habit.id, today, habit.target_per_day)}>
        <button
          type="submit"
          aria-label={done ? `Clear ${habit.name}` : `Log ${habit.name}`}
          aria-pressed={done}
          className="grid h-14 w-14 shrink-0 place-items-center"
        >
          <span
            className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[10px] tabular-nums ${
              done
                ? "border-emerald-600 bg-emerald-600 text-white"
                : partial
                  ? "border-accent text-accent"
                  : "border-border"
            }`}
          >
            {done ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l4 4L19 7" />
              </svg>
            ) : partial ? (
              `${habit.todayCount}/${habit.target_per_day}`
            ) : null}
          </span>
        </button>
      </form>

      <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1 py-3">
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
          {habit.slot !== "anytime" ? <span>{SLOT_LABEL[habit.slot]}</span> : null}
          {habit.target_per_day > 1 ? (
            <span>
              {habit.todayCount} of {habit.target_per_day}
            </span>
          ) : null}
        </span>
      </Link>

      {habit.streak > 0 ? (
        <span className="shrink-0 pr-4 text-xs tabular-nums text-muted">{habit.streak}d</span>
      ) : null}
    </div>
  );
}
