import Link from "next/link";

import { GoalChecks } from "@/components/goal-checks";
import { EmptyState, Screen } from "@/components/screen";
import { promoteToFocus, shelveGoal } from "@/lib/actions";
import { FOCUS_CAP } from "@/lib/focus";
import { getMacroStages, getPyramid } from "@/lib/queries";
import { getTimezone } from "@/lib/dates";
import type { GoalRow } from "@/lib/database.types";

export default async function TriagePage() {
  const timeZone = await getTimezone();
  const [focus, { dreams, shelved }] = await Promise.all([getPyramid(timeZone), getMacroStages()]);

  const room = FOCUS_CAP - focus.length;
  const overCap = focus.length > FOCUS_CAP;

  return (
    <Screen
      eyebrow="Choosing the right goals"
      title="What gets your focus?"
      quote="If you try to halfway do all ten, you will be frustrated, and failure will win."
    >
      <div
        className={`rounded-2xl border px-4 py-3 ${
          overCap ? "border-tier-atomic/40 bg-tier-atomic/5" : "border-border bg-surface-sunk"
        }`}
      >
        <p className="text-sm text-pretty">
          <strong className="font-medium">
            {focus.length} in focus
          </strong>{" "}
          — the method calls for three to five.
        </p>
        <p className="mt-1 text-xs text-muted text-pretty">
          {overCap
            ? `Shelve ${focus.length - FOCUS_CAP} to get back inside the cap. Shelved goals aren't dropped — they wait.`
            : room > 0
              ? `Room for ${room} more.`
              : "Full. Finish or shelve one before pulling another in."}
        </p>
      </div>

      <section className="mt-7">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          In focus now
        </h2>
        {focus.length === 0 ? (
          <EmptyState
            title="Nothing in focus"
            body="Promote a dream below and it lands on the board."
          />
        ) : (
          <ul className="space-y-2">
            {focus.map((goal) => (
              <li key={goal.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-start gap-3">
                  <Link href={`/goal/${goal.id}`} className="min-w-0 flex-1 leading-snug text-pretty">
                    {goal.title}
                  </Link>
                  <form action={shelveGoal.bind(null, goal.id)}>
                    <button
                      type="submit"
                      className="min-h-9 shrink-0 rounded-lg border border-border px-3 text-xs text-muted"
                    >
                      Shelve
                    </button>
                  </form>
                </div>
                {goal.blockedByTitle ? (
                  <p className="mt-1.5 text-xs text-tier-atomic text-pretty">
                    Waiting on: {goal.blockedByTitle}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          Dreams to evaluate
        </h2>
        {dreams.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            body="New macro goals land here first. Dream freely — you decide what moves into focus afterwards."
          />
        ) : (
          <ul className="space-y-3">
            {dreams.map((goal) => (
              <Candidate key={goal.id} goal={goal} canPromote={room > 0} />
            ))}
          </ul>
        )}
      </section>

      {shelved.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            Shelved — waiting their turn
          </h2>
          <ul className="space-y-3">
            {shelved.map((goal) => (
              <Candidate key={goal.id} goal={goal} canPromote={room > 0} shelved />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        Don&apos;t organise your dreams from the start. Dream first, then decide which few earn
        your attention now. Focus yields progress.
      </p>
    </Screen>
  );
}

function Candidate({
  goal,
  canPromote,
  shelved,
}: {
  goal: GoalRow;
  canPromote: boolean;
  shelved?: boolean;
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="leading-snug text-pretty">{goal.title}</p>
      {goal.detail ? <p className="mt-1 text-sm text-muted text-pretty">{goal.detail}</p> : null}

      <details className="mt-2">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
          Run the three checks
        </summary>
        <div className="mt-2">
          <GoalChecks goal={goal} compact />
        </div>
      </details>

      <div className="mt-3 flex gap-2">
        <form action={promoteToFocus.bind(null, goal.id)} className="flex-1">
          <button
            type="submit"
            disabled={!canPromote}
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg disabled:bg-surface-sunk disabled:text-muted"
          >
            {canPromote ? "Move into focus" : "Focus is full"}
          </button>
        </form>
        {shelved ? null : (
          <form action={shelveGoal.bind(null, goal.id)}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
            >
              Not now
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
