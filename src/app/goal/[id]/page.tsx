import Link from "next/link";
import { notFound } from "next/navigation";

import { AddGoalForm } from "@/components/add-goal-form";
import { GoalCard } from "@/components/goal-card";
import { Screen } from "@/components/screen";
import { reopenGoal } from "@/lib/actions";
import { getCategories, getMacroGoal, type GoalNode } from "@/lib/queries";

export default async function GoalPage({ params }: PageProps<"/goal/[id]">) {
  const { id } = await params;
  const [macro, categories] = await Promise.all([getMacroGoal(id), getCategories()]);
  if (!macro) notFound();

  const open = macro.children.filter((micro) => micro.status === "active");
  const done = macro.children.filter((micro) => micro.status === "done");

  return (
    <Screen eyebrow={macro.category?.name ?? "Macro goal"} title={macro.title}>
      <Link href="/" className="mb-4 inline-flex min-h-11 items-center text-sm text-muted">
        ← All goals
      </Link>

      <GoalCard goal={macro} category={macro.category} categories={categories} />

      <p className="mt-4 px-1 text-xs text-muted">
        {done.length} of {macro.children.length} micro goals finished
      </p>

      <section className="mt-3 space-y-3">
        {open.length === 0 && done.length === 0 ? (
          <p className="px-1 text-sm text-muted text-pretty">
            Break it down. Two or three micro goals — the milestones that prove this is moving.
            Download and decide on a training plan. Book the RV. Sort the logistics.
          </p>
        ) : null}

        {open.map((micro) => (
          <MicroGoal key={micro.id} micro={micro} />
        ))}

        <AddGoalForm tier="micro" parentId={macro.id} label="Micro goal" />
      </section>

      {done.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
            Finished
          </h2>
          <ul className="space-y-1.5">
            {done.map((micro) => (
              <li
                key={micro.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-sunk px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm text-muted line-through">
                  {micro.title}
                </span>
                <form action={reopenGoal.bind(null, micro.id)}>
                  <button type="submit" className="min-h-8 text-xs text-muted">
                    Undo
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        This stays open until the whole thing is done. Swipe the goal card at the top right only
        when you&apos;ve actually finished it — that&apos;s what buys a pull off the Avoidance List.
      </p>
    </Screen>
  );
}

function MicroGoal({ micro }: { micro: GoalNode }) {
  const minis = micro.children.filter((mini) => mini.status === "active");

  return (
    <GoalCard goal={micro}>
      {minis.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-l border-border pl-3">
          {minis.map((mini) => (
            <li key={mini.id} className="text-sm text-muted text-pretty">
              {mini.title}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3">
        <AddGoalForm tier="mini" parentId={micro.id} label="Mini goal — daily or weekly action" />
      </div>
    </GoalCard>
  );
}
