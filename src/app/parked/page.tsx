import { Field } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import { addAvoidanceItem, deleteAvoidanceItem, promoteAvoidanceItem } from "@/lib/actions";
import { formatDay } from "@/lib/dates";
import { getAvoidanceBoard } from "@/lib/queries";
import { AVOIDANCE_RULE, PRIORITY_LABEL, PULL_QUOTES } from "@/lib/workbook";

export default async function ParkedPage() {
  const { items, creditsAvailable, macroGoalsFinished } = await getAvoidanceBoard();
  const parked = items.filter((item) => item.promoted_at === null);
  const promoted = items.filter((item) => item.promoted_at !== null);

  return (
    <Screen eyebrow="Part 04" title="Avoidance list" quote={PULL_QUOTES.avoidance}>
      <div className="rounded-2xl border border-border bg-surface-sunk px-4 py-3">
        <p className="text-sm text-pretty">{AVOIDANCE_RULE}</p>
        <p className="mt-2 text-xs text-muted">
          {macroGoalsFinished === 0
            ? "No macro goals finished yet, so nothing can come off the list."
            : `${macroGoalsFinished} macro ${
                macroGoalsFinished === 1 ? "goal" : "goals"
              } finished · ${creditsAvailable} ${
                creditsAvailable === 1 ? "pull" : "pulls"
              } available`}
        </p>
      </div>

      <section className="mt-6 space-y-2">
        {parked.length === 0 ? (
          <EmptyState
            title="Nothing parked"
            body="Every shiny idea goes here. Not dead — just parked. You earn the right to pursue it."
          />
        ) : (
          <ul className="space-y-2">
            {parked.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 leading-snug text-pretty">{item.idea}</p>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                </div>

                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {item.revisit_on ? (
                    <div className="flex gap-1.5">
                      <dt className="font-medium text-foreground">Revisit</dt>
                      <dd>{formatDay(item.revisit_on)}</dd>
                    </div>
                  ) : null}
                  {item.replaces ? (
                    <div className="flex gap-1.5">
                      <dt className="font-medium text-foreground">Replaces</dt>
                      <dd>{item.replaces}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex gap-2">
                  <form action={promoteAvoidanceItem.bind(null, item.id)} className="flex-1">
                    <button
                      type="submit"
                      disabled={creditsAvailable < 1}
                      className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg disabled:bg-surface-sunk disabled:text-muted"
                    >
                      {creditsAvailable < 1 ? "Locked — finish a macro goal" : "Pull onto the board"}
                    </button>
                  </form>
                  <form action={deleteAvoidanceItem.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
                    >
                      Drop
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <details className="rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Park an idea
          </summary>
          <form action={addAvoidanceItem} className="space-y-2 border-t border-border px-4 py-3">
            <Field name="idea" label="Idea" required placeholder="Start YouTube" />
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
                Priority
              </span>
              <select
                name="priority"
                defaultValue="medium"
                className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
                Revisit date
              </span>
              <input
                type="date"
                name="revisit_on"
                className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
              />
            </label>
            <Field name="replaces" label="Replace what?" placeholder="What this would cost you" />
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
            >
              Park it
            </button>
          </form>
        </details>
      </section>

      {promoted.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
            Earned and pulled
          </h2>
          <ul className="space-y-1.5">
            {promoted.map((item) => (
              <li key={item.id} className="px-1 text-sm text-muted line-through">
                {item.idea}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        Focus wins. Shiny object syndrome doesn&apos;t.
      </p>
    </Screen>
  );
}
