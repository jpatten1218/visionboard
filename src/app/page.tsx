import Link from "next/link";

import { AddGoalForm } from "@/components/add-goal-form";
import { EmptyState, Screen } from "@/components/screen";
import { formatDay } from "@/lib/dates";
import { getCategories, getPyramid, type GoalNode } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function BoardPage() {
  const [macros, categories] = await Promise.all([getPyramid(), getCategories()]);

  // getPyramid already orders by category, so grouping is a single pass.
  const groups = new Map<string, { name: string; macros: GoalNode[] }>();
  for (const macro of macros) {
    const key = macro.category_id ?? "none";
    const group = groups.get(key) ?? {
      name: macro.category?.name ?? "Uncategorised",
      macros: [],
    };
    group.macros.push(macro);
    groups.set(key, group);
  }

  return (
    <Screen eyebrow="The board" title="Everything ladders up.">
      {macros.length === 0 ? (
        <EmptyState
          title="Nothing on the board"
          body="Start with one macro goal — six to eighteen months, written in marker. Break it down once it's up."
        />
      ) : (
        <div className="space-y-7">
          {[...groups.values()].map((group) => (
            <section key={group.name}>
              <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                {group.name}
              </h2>
              <ul className="space-y-2">
                {group.macros.map((macro) => (
                  <li key={macro.id}>
                    <MacroLink macro={macro} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-7">
        <AddGoalForm tier="macro" label="Macro goal" categories={categories} withFloorCeiling />
      </div>

      <p className="mt-4 px-1 text-xs text-muted text-pretty">
        Tap a goal to break it into micro goals and work it. No fake deadlines — you&apos;ve never
        done it before, so stop pretending you know the timeline.
      </p>

      {macros.length === 0 ? (
        <p className="mt-6 border-l-2 border-accent pl-3 text-sm italic text-muted text-pretty">
          {PULL_QUOTES.direction}
        </p>
      ) : null}
    </Screen>
  );
}

function MacroLink({ macro }: { macro: GoalNode }) {
  const total = macro.children.length;
  const done = macro.children.filter((micro) => micro.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Link
      href={`/goal/${macro.id}`}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface py-3.5 pl-5 pr-4"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-tier-macro" />

      <span className="min-w-0 flex-1">
        <span className="block leading-snug text-pretty">{macro.title}</span>
        <span className="mt-1 block text-xs text-muted">
          {total === 0 ? "No micro goals yet" : `${done} of ${total} micro goals`}
          {macro.target_on ? ` · Target ${formatDay(macro.target_on)}` : ""}
        </span>
        {total > 0 ? (
          <span
            aria-hidden
            className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-surface-sunk"
          >
            <span className="block h-full rounded-full bg-tier-macro" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </span>

      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
