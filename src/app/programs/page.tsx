import Link from "next/link";

import { HeroFigure, TileRow } from "@/components/capacity";
import { EmptyState, Screen } from "@/components/screen";
import { deleteProgram, logProgramEngagement } from "@/lib/actions";
import { formatDay, getTimezone, todayIn } from "@/lib/dates";
import { getMacroTitles, getPrograms, type ProgramView } from "@/lib/queries";
import {
  CADENCE_LABEL,
  IDLE_AFTER_DAYS,
  STATUS_LABEL,
  costTierLabel,
  formatMoney,
} from "@/lib/programs";
import { ProgramForm } from "@/components/program-form";

export default async function ProgramsPage() {
  const timeZone = await getTimezone();
  const today = todayIn(timeZone);
  const [board, goals] = await Promise.all([getPrograms(timeZone), getMacroTitles()]);

  const { programs, totalInvested, idleInvested, activeCount, idleCount, monthlyCommitments } =
    board;

  const unlinked = programs.filter(
    (program) => program.status === "active" && !program.goal_id,
  ).length;

  return (
    <Screen
      eyebrow="What you've bought"
      title="Programs"
      quote="Buying it was the easy part. This tracks whether you showed up."
    >
      {programs.length > 0 ? (
        <section>
          <HeroFigure
            value={Math.round(totalInvested)}
            label="dollars invested"
            note={
              idleInvested > 0
                ? `${formatMoney(idleInvested)} of it sitting in programs you haven't touched in ${IDLE_AFTER_DAYS}+ days.`
                : "Everything active has been touched this month."
            }
          />
          <div className="mt-4">
            <TileRow
              tiles={[
                { label: "Active programs", value: activeCount },
                { label: `Idle ${IDLE_AFTER_DAYS}+ days`, value: idleCount, alert: true },
                { label: "Not tied to a goal", value: unlinked, alert: true },
                { label: "Commitments a month", value: Math.round(monthlyCommitments) },
                { label: "Ending in 60 days", value: board.endingSoon.length },
                { label: "Total programs", value: programs.length },
              ]}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-7">
        <details className="rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Add a program
          </summary>
          <div className="border-t border-border px-4 py-3">
            <ProgramForm goals={goals} />
          </div>
        </details>
      </section>

      <section className="mt-7 space-y-3">
        {programs.length === 0 ? (
          <EmptyState
            title="No programs yet"
            body="Add the courses, memberships and coaching you've paid for. The tab exists to show which ones you're actually using."
          />
        ) : (
          programs.map((program) => (
            <ProgramCard key={program.id} program={program} today={today} goals={goals} />
          ))
        )}
      </section>

      {programs.length > 0 ? (
        <p className="mt-8 px-1 text-sm text-muted text-pretty">
          Log a session every time you actually show up. A program with no sessions and no goal
          attached isn&apos;t an investment — it&apos;s a receipt.
        </p>
      ) : null}
    </Screen>
  );
}

/** "Jan 3 – Jun 3", "Evergreen", or whichever half is known. */
function describePeriod(program: ProgramView): string {
  if (program.evergreen) return "Evergreen";
  if (program.started_on && program.ends_on) {
    return `${formatDay(program.started_on)} – ${formatDay(program.ends_on)}`;
  }
  if (program.ends_on) return `Ends ${formatDay(program.ends_on)}`;
  if (program.started_on) return `Since ${formatDay(program.started_on)}`;
  return "No dates set";
}

function ProgramCard({
  program,
  today,
  goals,
}: {
  program: ProgramView;
  today: string;
  goals: { id: string; title: string }[];
}) {
  const idle =
    program.status === "active" &&
    (program.idleDays === null || program.idleDays >= IDLE_AFTER_DAYS);

  return (
    <article
      className={`rounded-2xl border px-4 py-3.5 ${
        idle ? "border-tier-atomic/40 bg-tier-atomic/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="leading-snug text-pretty">{program.name}</p>
          {program.provider ? (
            <p className="mt-0.5 text-xs text-muted">{program.provider}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted">
          {program.cost !== null ? formatMoney(program.cost) : costTierLabel(program.cost_tier)}
        </span>
      </div>

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <div className="flex gap-1.5">
          <dt className="sr-only">Commitment</dt>
          <dd>{CADENCE_LABEL[program.cadence]}</dd>
        </div>
        {program.commitment ? <dd>{program.commitment}</dd> : null}
        {program.status !== "active" ? <dd>{STATUS_LABEL[program.status]}</dd> : null}
        <dd>{describePeriod(program)}</dd>
      </dl>

      <p className={`mt-2 text-xs ${idle ? "text-tier-atomic" : "text-muted"}`}>
        {program.lastEngagedOn === null
          ? "Never logged a session"
          : `Last session ${formatDay(program.lastEngagedOn)} · ${program.idleDays} ${
              program.idleDays === 1 ? "day" : "days"
            } ago · ${program.engagements} total`}
      </p>

      {program.goalTitle ? (
        <p className="mt-1.5 text-xs text-muted">
          Serves: <span className="text-foreground">{program.goalTitle}</span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-tier-atomic text-pretty">
          Not attached to any goal — what is it for?
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={logProgramEngagement.bind(null, program.id, today)} className="flex-1">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
          >
            I showed up today
          </button>
        </form>
        {program.url ? (
          <Link
            href={program.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-muted"
          >
            Open
          </Link>
        ) : null}
      </div>

      <details className="mt-2">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
          Edit
        </summary>
        <div className="mt-2 space-y-3">
          <ProgramForm goals={goals} program={program} />
          <form action={deleteProgram.bind(null, program.id)}>
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
            >
              Remove program
            </button>
          </form>
        </div>
      </details>
    </article>
  );
}
