import { CategorySelect, DateField, Field } from "@/components/goal-card";
import { addHabit, updateHabit } from "@/lib/actions";
import type { CategoryRow, HabitRow } from "@/lib/database.types";
import { DAY_NAMES, SLOT_LABEL } from "@/lib/habits";

const SELECT_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent";

export function HabitForm({
  categories,
  habit,
}: {
  categories: CategoryRow[];
  habit?: HabitRow;
}) {
  const action = habit ? updateHabit.bind(null, habit.id) : addHabit;
  const chosen = new Set(habit?.weekdays ?? []);

  return (
    <form action={action} className="space-y-2">
      <Field name="name" label="Habit" required defaultValue={habit?.name} placeholder="Read 10 pages" />
      <Field name="detail" label="Detail" defaultValue={habit?.detail ?? ""} />

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Repeat</span>
        <select name="repeat_kind" defaultValue={habit?.repeat_kind ?? "daily"} className={SELECT_CLASS}>
          <option value="daily">Every day</option>
          <option value="weekdays">Chosen days</option>
        </select>
      </label>

      <fieldset>
        <legend className="mb-1 text-[11px] uppercase tracking-wide text-muted">
          Which days (only used for chosen days)
        </legend>
        <div className="flex gap-1">
          {DAY_NAMES.map((name, day) => (
            <label
              key={name}
              className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border text-center text-[11px] leading-[2.75rem] text-muted has-checked:border-accent has-checked:bg-accent has-checked:text-accent-fg"
            >
              <input
                type="checkbox"
                name="weekdays"
                value={day}
                defaultChecked={chosen.has(day)}
                className="sr-only"
              />
              {name.slice(0, 1)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <Field
          name="target_per_day"
          label="Times per day"
          defaultValue={String(habit?.target_per_day ?? 1)}
          placeholder="1"
        />
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
            Time of day
          </span>
          <select name="slot" defaultValue={habit?.slot ?? "anytime"} className={SELECT_CLASS}>
            {(Object.keys(SLOT_LABEL) as (keyof typeof SLOT_LABEL)[]).map((slot) => (
              <option key={slot} value={slot}>
                {SLOT_LABEL[slot]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CategorySelect categories={categories} defaultValue={habit?.category_id ?? ""} />
      <DateField name="ends_on" label="Stop tracking on (optional)" defaultValue={habit?.ends_on ?? ""} />

      <button
        type="submit"
        className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
      >
        {habit ? "Save changes" : "Add habit"}
      </button>
    </form>
  );
}
