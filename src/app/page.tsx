import Image from "next/image";
import Link from "next/link";

import { AddGoalForm } from "@/components/add-goal-form";
import { EmptyState, Screen } from "@/components/screen";
import { FOCUS_CAP, FOCUS_FLOOR } from "@/lib/focus";
import { categoryColor } from "@/lib/category-color";
import { countdown, getTimezone, todayIn } from "@/lib/dates";
import { getCategories, getMacroStages, getPyramid, type GoalNode } from "@/lib/queries";
import { PULL_QUOTES } from "@/lib/workbook";

export default async function BoardPage() {
  const timeZone = await getTimezone();
  const [macros, categories, { dreams }] = await Promise.all([
    getPyramid(timeZone),
    getCategories(),
    getMacroStages(),
  ]);
  const today = todayIn(timeZone);

  // getPyramid already orders by category, so grouping is a single pass.
  const groups = new Map<string, { name: string; color: string; macros: GoalNode[] }>();
  for (const macro of macros) {
    const key = macro.category_id ?? "none";
    const group = groups.get(key) ?? {
      name: macro.category?.name ?? "Uncategorised",
      color: categoryColor(macro.category?.color_slot),
      macros: [],
    };
    group.macros.push(macro);
    groups.set(key, group);
  }

  const overCap = macros.length > FOCUS_CAP;
  const needsTriage = dreams.length > 0 || overCap;

  return (
    <Screen eyebrow="The board" title="Everything ladders up.">
      {/* Always reachable, loud only when something needs deciding. */}
      <Link
        href="/triage"
        className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          overCap
            ? "border-tier-atomic/40 bg-tier-atomic/5"
            : needsTriage
              ? "border-border bg-surface-sunk"
              : "border-border"
        }`}
      >
        <span className="min-w-0 flex-1 text-sm text-pretty">
          {overCap ? (
            <>
              <strong className="font-medium">{macros.length} goals in focus.</strong> The method
              calls for {FOCUS_FLOOR} to {FOCUS_CAP}.
            </>
          ) : dreams.length > 0 ? (
            <>
              <strong className="font-medium">
                {dreams.length} {dreams.length === 1 ? "dream" : "dreams"} waiting.
              </strong>{" "}
              Decide what earns your focus.
            </>
          ) : (
            <span className="text-muted">
              {macros.length} of {FOCUS_CAP} in focus
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted">Triage →</span>
      </Link>

      {macros.length === 0 ? (
        <EmptyState
          title="Nothing on the board"
          body="Start with one macro goal — six to eighteen months, written in marker. Break it down once it's up."
        />
      ) : (
        <div className="space-y-7">
          {[...groups.values()].map((group) => (
            <section key={group.name}>
              <h2 className="mb-2 flex items-center gap-2 px-1 text-[11px] uppercase tracking-[0.16em]">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: group.color }}
                />
                {/* The dot carries the identity; the text stays in an ink
                    token. Three of the light steps sit under 3:1 and would be
                    genuinely hard to read as small uppercase type. */}
                <span className="text-muted">{group.name}</span>
              </h2>
              <ul className="space-y-2">
                {group.macros.map((macro) => (
                  <li key={macro.id}>
                    <MacroLink macro={macro} color={group.color} today={today} />
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

function MacroLink({ macro, color, today }: { macro: GoalNode; color: string; today: string }) {
  const total = macro.children.length;
  const done = macro.children.filter((micro) => micro.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const clock = macro.target_on ? countdown(macro.target_on, today) : null;

  return (
    <Link
      href={`/goal/${macro.id}`}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface py-3.5 pl-5 pr-4"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />

      {macro.imageUrl ? (
        <Image
          src={macro.imageUrl}
          alt=""
          width={104}
          height={104}
          sizes="52px"
          className="h-13 w-13 shrink-0 rounded-xl object-cover"
        />
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block leading-snug text-pretty">{macro.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{total === 0 ? "No micro goals yet" : `${done} of ${total} micro goals`}</span>
          {clock ? (
            <span className={clock.overdue ? "text-tier-atomic" : ""}>{clock.label}</span>
          ) : null}
          {macro.stalledDays ? (
            <span className="rounded-full border border-tier-atomic/40 px-1.5 py-0.5 text-[10px] text-tier-atomic">
              Stalled {macro.stalledDays}d
            </span>
          ) : null}
          {macro.blockedByTitle ? (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px]">
              Waiting on {macro.blockedByTitle}
            </span>
          ) : null}
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
