import { Field } from "@/components/goal-card";
import { createGoal } from "@/lib/actions";
import type { GoalTier } from "@/lib/database.types";
import { TIERS } from "@/lib/workbook";

export function AddGoalForm({
  tier,
  parentId,
  label,
  withFloorCeiling,
}: {
  tier: GoalTier;
  parentId?: string;
  label: string;
  withFloorCeiling?: boolean;
}) {
  const meta = TIERS[tier];

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
        {withFloorCeiling ? (
          <div className="grid grid-cols-2 gap-2">
            <Field name="floor" label="Floor" placeholder="Walk 2 minutes" />
            <Field name="ceiling" label="Ceiling" placeholder="Train 90 minutes" />
          </div>
        ) : null}
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
