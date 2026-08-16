import { SwipeToComplete } from "@/components/swipe-to-complete";
import { completeGoal, deleteGoal, updateGoal } from "@/lib/actions";
import type { GoalRow } from "@/lib/database.types";
import { TIERS } from "@/lib/workbook";

const TIER_TEXT: Record<GoalRow["tier"], string> = {
  universal: "text-tier-universal",
  macro: "text-tier-macro",
  micro: "text-tier-micro",
  mini: "text-tier-mini",
  atomic: "text-tier-atomic",
};

const TIER_BORDER: Record<GoalRow["tier"], string> = {
  universal: "bg-tier-universal",
  macro: "bg-tier-macro",
  micro: "bg-tier-micro",
  mini: "bg-tier-mini",
  atomic: "bg-tier-atomic",
};

export function GoalCard({ goal, children }: { goal: GoalRow; children?: React.ReactNode }) {
  return (
    <SwipeToComplete onComplete={completeGoal.bind(null, goal.id)} actionLabel="Evidence">
      <article className="relative overflow-hidden rounded-2xl">
        {/* The tier stripe replaces the workbook's sticky colour. */}
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TIER_BORDER[goal.tier]}`} />
        <div className="py-3.5 pl-5 pr-4">
          <p className={`text-[10px] uppercase tracking-[0.16em] ${TIER_TEXT[goal.tier]}`}>
            {TIERS[goal.tier].label}
          </p>
          <p className="mt-1 leading-snug text-pretty">{goal.title}</p>
          {goal.detail ? (
            <p className="mt-1.5 text-sm text-muted text-pretty">{goal.detail}</p>
          ) : null}

          {goal.floor || goal.ceiling ? (
            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {goal.floor ? (
                <div className="flex gap-1.5">
                  <dt className="font-medium text-foreground">Floor</dt>
                  <dd>{goal.floor}</dd>
                </div>
              ) : null}
              {goal.ceiling ? (
                <div className="flex gap-1.5">
                  <dt className="font-medium text-foreground">Ceiling</dt>
                  <dd>{goal.ceiling}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {children}

          <details className="group mt-2">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
              Edit
            </summary>
            <form action={updateGoal} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={goal.id} />
              <Field name="title" label="Goal" defaultValue={goal.title} required />
              <Field name="detail" label="Detail" defaultValue={goal.detail ?? ""} />
              <div className="grid grid-cols-2 gap-2">
                <Field name="floor" label="Floor" defaultValue={goal.floor ?? ""} />
                <Field name="ceiling" label="Ceiling" defaultValue={goal.ceiling ?? ""} />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-medium text-accent-fg"
                >
                  Save
                </button>
                <button
                  type="submit"
                  formAction={deleteGoal.bind(null, goal.id)}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
                >
                  Delete
                </button>
              </div>
            </form>
          </details>
        </div>
      </article>
    </SwipeToComplete>
  );
}

export function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        // min-h-11 keeps the tap target at 44pt; the 16px font size set
        // globally is what stops iOS zooming on focus.
        className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
      />
    </label>
  );
}
