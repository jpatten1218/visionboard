import { CategorySelect, DateField, Field, FloorCeilingFields } from "@/components/goal-card";
import { createGoal } from "@/lib/actions";
import type { CategoryRow, GoalTier } from "@/lib/database.types";
import { TIERS } from "@/lib/workbook";

export function AddGoalForm({
  tier,
  parentId,
  label,
  categories,
  withFloorCeiling,
}: {
  tier: GoalTier;
  parentId?: string;
  label: string;
  /** Supplied for macro goals, the tier that carries a category and a target. */
  categories?: CategoryRow[];
  withFloorCeiling?: boolean;
}) {
  const meta = TIERS[tier];
  const isMacro = tier === "macro";
  // Habits carry a category too, so logged days can be grouped on Evidence.
  const showsCategory = isMacro || tier === "atomic";

  return (
    <details className="rounded-2xl border border-dashed border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
        + {label}
      </summary>
      <form action={createGoal} className="space-y-2 border-t border-border px-4 py-3">
        <input type="hidden" name="tier" value={tier} />
        {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
        <Field
          name="title"
          label={meta.label}
          required
          placeholder={meta.examples[0] ?? "Write it in marker"}
        />
        <Field name="detail" label="Detail" />
        {showsCategory ? (
          isMacro ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <CategorySelect categories={categories ?? []} />
                <DateField name="target_on" label="Target" />
              </div>
              <p className="text-xs text-muted text-pretty">
                A target is optional. The workbook argues against fixed deadlines on a macro goal —
                you&apos;ve never done it before, so the date is a direction, not a debt.
              </p>
            </>
          ) : (
            <CategorySelect categories={categories ?? []} />
          )
        ) : null}
        {withFloorCeiling ? <FloorCeilingFields /> : null}
        <p className="text-xs text-muted text-pretty">{meta.blurb}</p>
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
        >
          Add
        </button>
      </form>
    </details>
  );
}
