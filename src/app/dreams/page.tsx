import Link from "next/link";

import { GoalChecks } from "@/components/goal-checks";
import { EmptyState, Screen } from "@/components/screen";
import { HeroFigure, TileRow } from "@/components/capacity";
import { createGoal, promoteToFocus, shelveGoal } from "@/lib/actions";
import { getMacroStages, getPyramid, getToday } from "@/lib/queries";
import { getTimezone } from "@/lib/dates";
import type { GoalRow } from "@/lib/database.types";

export default async function DreamBoardPage() {
  const timeZone = await getTimezone();
  const [focus, { dreams, shelved }, { atomic }] = await Promise.all([
    getPyramid(timeZone),
    getMacroStages(),
    getToday(timeZone),
  ]);

  const micros = focus.flatMap((macro) => macro.children);
  const microOpen = micros.filter((micro) => micro.status === "active").length;
  const miniOpen = micros
    .flatMap((micro) => micro.children)
    .filter((mini) => mini.status === "active").length;
  const stalled = focus.filter((macro) => macro.stalledDays).length;
  const waiting = focus.filter((macro) => macro.blocked_by).length;
  const dailyLoad = atomic.length;

  return (
    <Screen
      eyebrow="Choosing the right goals"
      title="Dream board"
      quote="If you try to halfway do all ten, you will be frustrated, and failure will win."
    >
      {/* Capture first, evaluate later — so the input sits at the top and asks
          for nothing but the idea. */}
      <form action={createGoal} className="flex gap-2">
        <input type="hidden" name="tier" value="macro" />
        <input
          name="title"
          required
          placeholder="What else do you want?"
          aria-label="New dream"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-sunk px-4 outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-xl bg-accent px-5 text-sm font-medium text-accent-fg"
        >
          Add
        </button>
      </form>
      <p className="mt-2 text-xs text-muted text-pretty">
        Dream freely and unreasonably. Nothing here is a commitment until you move it into focus.
      </p>

      <section className="mt-7">
        <HeroFigure
          value={focus.length}
          label={focus.length === 1 ? "goal in focus" : "goals in focus"}
          note={`${microOpen + miniOpen} open steps underneath, and ${dailyLoad} ${
            dailyLoad === 1 ? "thing" : "things"
          } to do every single day.`}
        />
        <div className="mt-4">
          <TileRow
            tiles={[
              { label: "Micro goals open", value: microOpen },
              { label: "Mini goals open", value: miniOpen },
              { label: "Daily non-negotiables", value: dailyLoad },
              { label: "Stalled 30+ days", value: stalled, alert: true },
              { label: "Waiting on another", value: waiting },
              { label: "Dreams unevaluated", value: dreams.length },
            ]}
          />
        </div>
      </section>

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
              <Candidate key={goal.id} goal={goal} />
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
              <Candidate key={goal.id} goal={goal} shelved />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        Don&apos;t organise your dreams from the start. Dream first, then decide which earn your
        attention now. Focus yields progress — the numbers above are there so you can see what
        you&apos;re already carrying before you add another.
      </p>
    </Screen>
  );
}

function Candidate({ goal, shelved }: { goal: GoalRow; shelved?: boolean }) {
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
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
          >
            Move into focus
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
