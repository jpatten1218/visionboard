import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddGoalForm } from "@/components/add-goal-form";
import { GoalCard } from "@/components/goal-card";
import { Screen } from "@/components/screen";
import { ChecksSummary, GoalChecks } from "@/components/goal-checks";
import {
  completeGoal,
  deleteGoal,
  dropGoal,
  recommitGoal,
  removeGoalImage,
  reopenGoal,
  setBlockedBy,
  shelveGoal,
  uploadGoalImage,
} from "@/lib/actions";
import { countdown, formatDay, getTimezone, todayIn } from "@/lib/dates";
import { getCategories, getMacroGoal, getMacroTitles, type GoalNode } from "@/lib/queries";

export default async function GoalPage({ params }: PageProps<"/goal/[id]">) {
  const { id } = await params;
  const timeZone = await getTimezone();
  const [macro, categories, macroTitles] = await Promise.all([
    getMacroGoal(id, timeZone),
    getCategories(),
    getMacroTitles(),
  ]);
  if (!macro) notFound();

  const others = macroTitles.filter((other) => other.id !== id);

  const open = macro.children.filter((micro) => micro.status === "active");
  const done = macro.children.filter((micro) => micro.status === "done");
  const clock = macro.target_on ? countdown(macro.target_on, todayIn(timeZone)) : null;

  return (
    <Screen eyebrow={macro.category?.name ?? "Macro goal"} title={macro.title}>
      <Link href="/" className="mb-4 inline-flex min-h-11 items-center text-sm text-muted">
        ← All goals
      </Link>

      {macro.imageUrl ? (
        <div className="relative mb-3 aspect-[3/2] overflow-hidden rounded-2xl bg-surface-sunk">
          <Image
            src={macro.imageUrl}
            alt=""
            fill
            sizes="(max-width: 42rem) 100vw, 42rem"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <ImageControls goalId={macro.id} hasImage={Boolean(macro.imageUrl)} />

      {clock ? (
        <p className="mb-3 flex items-baseline gap-2">
          <span
            className={`font-serif text-3xl tabular-nums ${clock.overdue ? "text-tier-atomic" : ""}`}
          >
            {clock.label}
          </span>
          <span className="text-sm text-muted">
            {clock.overdue ? "past target" : "to go"} · {formatDay(macro.target_on!)}
          </span>
        </p>
      ) : null}

      {macro.stalledDays ? <StalledPrompt macro={macro} /> : null}

      <GoalCard goal={macro} category={macro.category} categories={categories} />

      {macro.blockedByTitle ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface-sunk px-4 py-3 text-sm text-pretty">
          <strong className="font-medium">Waiting on:</strong> {macro.blockedByTitle}. Finish that
          first — pursuing this before it is ready is how the effort gets wasted.
        </p>
      ) : null}

      <details className="mt-3 rounded-2xl border border-dashed border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
          The three checks
          {macro.check_alignment || macro.check_energy || macro.check_impact ? "" : " — unanswered"}
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-3">
          <ChecksSummary goal={macro} />
          <GoalChecks goal={macro} />
        </div>
      </details>

      <details className="mt-2 rounded-2xl border border-dashed border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
          Does something have to happen first?
        </summary>
        <form
          action={setBlockedBy.bind(null, macro.id)}
          className="space-y-2 border-t border-border px-4 py-3"
        >
          <select
            name="blocked_by"
            defaultValue={macro.blocked_by ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
          >
            <option value="">Nothing — this can run now</option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
          >
            Save
          </button>
        </form>
      </details>

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

/**
 * It is a vision board, so a macro goal can carry a picture of the thing.
 * `accept="image/*"` is what makes iOS offer the photo library and the camera
 * rather than a file browser.
 */
function ImageControls({ goalId, hasImage }: { goalId: string; hasImage: boolean }) {
  return (
    <details className="mb-3 rounded-2xl border border-dashed border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
        {hasImage ? "Change image" : "+ Add an image"}
      </summary>

      <form
        action={uploadGoalImage.bind(null, goalId)}
        className="space-y-2 border-t border-border px-4 py-3"
      >
        <input
          type="file"
          name="image"
          accept="image/*"
          required
          className="w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-surface-sunk file:px-4 file:text-sm file:text-foreground"
        />
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
        >
          Upload
        </button>
      </form>

      {hasImage ? (
        <form
          action={removeGoalImage.bind(null, goalId)}
          className="border-t border-border px-4 py-3"
        >
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
          >
            Remove image
          </button>
        </form>
      ) : null}
    </details>
  );
}

/**
 * Section 07, made into a decision rather than a nag. The three drop-signs are
 * Matt's, and so is the distinction that matters most: changing a goal because
 * you have realised something is not the same as changing it because you
 * couldn't hold the line.
 */
function StalledPrompt({ macro }: { macro: GoalNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-tier-atomic/40 bg-tier-atomic/5 px-4 py-3">
      <p className="text-sm text-pretty">
        <strong className="font-medium">Stalled {macro.stalledDays} days.</strong> Nothing under
        this has been finished since {formatDay(macro.lastMovedOn!)}.
      </p>
      <p className="mt-2 text-xs text-muted text-pretty">
        Drop it if it no longer aligns with your values, drains you without a meaningful return, or
        feels forced instead of inspiring. But be honest about which this is: changing a goal out of
        awareness is not the same as changing it because you couldn&apos;t hold the line.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={recommitGoal.bind(null, macro.id)} className="flex-1">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
          >
            Still on — recommit
          </button>
        </form>
        <form action={shelveGoal.bind(null, macro.id)}>
          <button
            type="submit"
            className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
          >
            Shelve
          </button>
        </form>
      </div>

      <details className="mt-2">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-xs text-muted marker:hidden">
          Pivot or drop it
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-xs text-muted text-pretty">
            Adjust your approach before you abandon the goal — often what is broken is the plan, not
            the destination. Edit it above, or record the drop here.
          </p>
          <form action={dropGoal.bind(null, macro.id)} className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
                Why are you dropping it?
              </span>
              <select
                name="dropped_reason"
                className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
              >
                <option value="No longer aligns with my values or bigger vision">
                  No longer aligns with my values
                </option>
                <option value="Drains energy without a meaningful return">
                  Drains energy without meaningful return
                </option>
                <option value="Feels forced instead of inspiring">
                  Feels forced instead of inspiring
                </option>
                <option value="Already accomplished what it was really for">
                  Already got what it was really for
                </option>
              </select>
            </label>
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl border border-tier-atomic/40 text-sm text-tier-atomic"
            >
              Drop this goal
            </button>
          </form>
        </div>
      </details>
    </section>
  );
}

function MicroGoal({ micro }: { micro: GoalNode }) {
  const open = micro.children.filter((mini) => mini.status === "active");
  const done = micro.children.filter((mini) => mini.status === "done");

  const hasMinis = micro.children.length > 0;

  return (
    <GoalCard goal={micro}>
      {/* Everything below the title folds away — the mini list and the form to
          add more — so a goal with ten micros reads as a list of titles. */}
      <details className="group mt-2">
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
          {hasMinis
            ? `${done.length} of ${micro.children.length} mini goals done`
            : "No mini goals yet"}
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
