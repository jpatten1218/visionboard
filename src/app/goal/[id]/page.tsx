import Link from "next/link";
import { notFound } from "next/navigation";

import { AddGoalForm } from "@/components/add-goal-form";
import { GoalCard } from "@/components/goal-card";
import { Screen } from "@/components/screen";
import { completeGoal, deleteGoal, reopenGoal } from "@/lib/actions";
import { formatDay } from "@/lib/dates";
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
  const open = micro.children.filter((mini) => mini.status === "active");
  const done = micro.children.filter((mini) => mini.status === "done");

  const hasMinis = micro.children.length > 0;

  return (
    <GoalCard goal={micro}>
      {/* Collapsed once it has content, so a goal with ten micros reads as a
          list rather than a wall. A micro with no minis yet opens, because
          the thing it needs is the form inside. */}
      <details open={!hasMinis} className="group mt-2">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-xs text-muted marker:hidden">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
          {hasMinis ? `${done.length} of ${micro.children.length} mini goals done` : "Add mini goals"}
        </summary>

        {hasMinis ? (
          <ul className="mt-1 space-y-1 border-l border-border pl-3">
            {open.map((mini) => (
              <MiniRow key={mini.id} mini={mini} />
            ))}
            {done.map((mini) => (
              <MiniRow key={mini.id} mini={mini} done />
            ))}
          </ul>
        ) : null}

        <div className="mt-3">
          <AddGoalForm tier="mini" parentId={micro.id} label="Mini goal — daily or weekly action" />
        </div>
      </details>
    </GoalCard>
  );
}

/**
 * Ticked in place, rather than swiped like the cards above it. A swipe here
 * would sit inside the micro goal's own swipe target and the two would fight
 * over the same gesture.
 */
function MiniRow({ mini, done }: { mini: GoalNode; done?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 py-1">
      <form action={(done ? reopenGoal : completeGoal).bind(null, mini.id)} className="shrink-0">
        <button
          type="submit"
          aria-label={done ? `Reopen ${mini.title}` : `Complete ${mini.title}`}
          aria-pressed={Boolean(done)}
          // The row is compact, so the tap target is padded out to 44pt
          // rather than being only as big as the circle it draws.
          className="-m-2.5 grid h-11 w-11 place-items-center"
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
              done ? "border-emerald-600 bg-emerald-600 text-white" : "border-border"
            }`}
          >
            {done ? (
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12l4 4L19 7" />
              </svg>
            ) : null}
          </span>
        </button>
      </form>

      <span className="min-w-0 flex-1 pt-0.5">
        <span className={`block text-sm text-pretty ${done ? "text-muted line-through" : ""}`}>
          {mini.title}
        </span>
        {mini.target_on ? (
          <span className="mt-0.5 block text-[11px] text-muted">
            Target {formatDay(mini.target_on)}
          </span>
        ) : null}
      </span>

      <form action={deleteGoal.bind(null, mini.id)} className="shrink-0">
        <button type="submit" aria-label={`Remove ${mini.title}`} className="px-1 text-muted">
          ×
        </button>
      </form>
    </li>
  );
}
