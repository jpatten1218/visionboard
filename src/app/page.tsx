import { AddGoalForm } from "@/components/add-goal-form";
import { BoardCarousel } from "@/components/board-carousel";
import { GoalCard } from "@/components/goal-card";
import type { CategoryRow } from "@/lib/database.types";
import { getCategories, getPyramid, type GoalNode } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function BoardPage() {
  const [macros, categories] = await Promise.all([getPyramid(), getCategories()]);

  const panels = [
    ...macros.map((macro) => ({
      key: macro.id,
      node: <MacroPanel macro={macro} categories={categories} />,
    })),
    { key: "new", node: <NewMacroPanel isFirst={macros.length === 0} categories={categories} /> },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col pad-safe-x">
      <header className="px-5 pt-6 pb-4 pad-safe-top">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">The Board</p>
        <h1 className="font-serif text-3xl leading-tight">Everything ladders up.</h1>
      </header>
      <BoardCarousel panels={panels} />
    </div>
  );
}

function MacroPanel({ macro, categories }: { macro: GoalNode; categories: CategoryRow[] }) {
  return (
    <div className="space-y-3 px-5 pb-8">
      <GoalCard goal={macro} category={macro.category} categories={categories} />

      {macro.children.length === 0 ? (
        <p className="px-1 text-sm text-muted text-pretty">
          Add two or three micro goals — the milestones that prove this is moving.
        </p>
      ) : null}

      {macro.children.map((micro) => (
        <GoalCard key={micro.id} goal={micro}>
          {micro.children.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-l border-border pl-3">
              {micro.children.map((mini) => (
                <li key={mini.id} className="text-sm text-muted text-pretty">
                  {mini.title}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <AddGoalForm tier="mini" parentId={micro.id} label="Mini goal" />
          </div>
        </GoalCard>
      ))}

      <AddGoalForm tier="micro" parentId={macro.id} label="Micro goal" />
    </div>
  );
}

function NewMacroPanel({
  isFirst,
  categories,
}: {
  isFirst: boolean;
  categories: CategoryRow[];
}) {
  return (
    <div className="space-y-4 px-5 pb-8">
      {isFirst ? (
        <p className="border-l-2 border-accent pl-3 text-sm italic text-muted text-pretty">
          {PULL_QUOTES.direction}
        </p>
      ) : null}
      <AddGoalForm tier="macro" label="Macro goal" categories={categories} withFloorCeiling />
      <p className="px-1 text-xs text-muted text-pretty">
        Six to eighteen months. No fake deadlines — you&apos;ve never done it before, so stop
        pretending you know the timeline. Swipe a card right to move it to Evidence.
      </p>
    </div>
  );
}
