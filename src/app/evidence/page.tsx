import Link from "next/link";

import { CategorySelect, DateField, Field } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import { addEvidenceEntry, deleteEvidenceEntry } from "@/lib/actions";
import {
  BreadthBar,
  EvidenceStack,
  MilestoneMeter,
  MomentumCurve,
} from "@/components/momentum";
import { categoryColor } from "@/lib/category-color";
import { formatDay, getTimezone, recentDays, todayIn } from "@/lib/dates";
import { getCategories, getEvidence, type EvidenceEntry } from "@/lib/queries";
import { PULL_QUOTES, TIERS } from "@/lib/workbook";

export default async function EvidencePage({ searchParams }: PageProps<"/evidence">) {
  const params = await searchParams;
  // Category is the default view: which parts of your life are moving is the
  // question this page answers on a bad day. Date is a lookup.
  const groupByCategory = params.by !== "date";

  const timeZone = await getTimezone();
  const today = todayIn(timeZone);
  const [entries, categories] = await Promise.all([getEvidence(timeZone), getCategories()]);

  const last7 = new Set(recentDays(today, 7));
  const activeLast7 = new Set(
    entries.filter((entry) => last7.has(entry.on)).map((entry) => entry.on),
  ).size;

  const last30 = new Set(recentDays(today, 30));
  const recent30 = entries.filter((entry) => last30.has(entry.on));
  const areas = new Set(recent30.map((entry) => entry.categoryName ?? "Uncategorised")).size;
  const breadthLabel =
    recent30.length === 0
      ? "Nothing in the last 30 days — the stack above is still yours."
      : `${recent30.length} in the last 30 days, across ${areas} ${
          areas === 1 ? "part" : "parts"
        } of your life.`;

  // Category order follows the settings list, with uncategorised last.
  const order = [...categories.map((category) => category.name), null];
  const slotByName = new Map(categories.map((category) => [category.name, category.color_slot]));
  const grouped = new Map<string, EvidenceEntry[]>();
  for (const entry of entries) {
    const key = groupByCategory ? entry.categoryName ?? "Uncategorised" : entry.on;
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  const sections = [...grouped.keys()].sort((a, b) => {
    if (!groupByCategory) return b.localeCompare(a);
    const rank = (name: string) => {
      const index = order.indexOf(name === "Uncategorised" ? null : name);
      return index === -1 ? order.length : index;
    };
    return rank(a) - rank(b);
  });

  return (
    <Screen
      eyebrow="Progress, not perfection"
      title="Evidence of progress"
      quote={PULL_QUOTES.progress}
    >
      {/* The hero figure — every number on this page is one that can only go
          up. Proportional figures, not tabular: a standalone value at display
          size looks loose when every digit is forced to a zero's width. */}
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold">{entries.length}</span>
        <span className="text-sm text-muted">
          {entries.length === 1 ? "win stacked" : "wins stacked"}
        </span>
      </div>
      <MilestoneMeter total={entries.length} />

      <section className="mt-7">
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">The stack</h2>
        <EvidenceStack entries={entries} />
      </section>

      {entries.length > 0 ? (
        <>
          <section className="mt-7">
            <h2 className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted">Momentum</h2>
            <MomentumCurve entries={entries} today={today} />
          </section>

          <section className="mt-7">
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              Where it came from
            </h2>
            <BreadthBar entries={recent30} label={breadthLabel} />
          </section>

          <p className="mt-5 rounded-2xl border border-border bg-surface-sunk px-4 py-3 text-sm text-pretty">
            {activeLast7 === 0
              ? "Nothing logged in the last seven days — but everything above still happened. Move one thing today."
              : `You moved something on ${activeLast7} of the last 7 days.`}
          </p>
        </>
      ) : null}

      <section className="mt-6">
        <details className="rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Add evidence
          </summary>
          <form action={addEvidenceEntry} className="space-y-2 border-t border-border px-4 py-3">
            <Field name="title" label="What you did" required placeholder="Ran the Moab route" />
            <Field name="note" label="Note" />
            <div className="grid grid-cols-2 gap-2">
              <CategorySelect categories={categories} />
              <DateField name="happened_on" label="When" defaultValue={today} />
            </div>
            <p className="text-xs text-muted text-pretty">
              For wins that were never on the board. Finished goals and logged habits land here on
              their own.
            </p>
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
            >
              Stack it
            </button>
          </form>
        </details>
      </section>

      <nav className="mt-6 flex gap-2" aria-label="Group evidence by">
        <ViewTab href="/evidence" label="By category" active={groupByCategory} />
        <ViewTab href="/evidence?by=date" label="By date" active={!groupByCategory} />
      </nav>

      <section className="mt-4 space-y-5">
        {sections.length === 0 ? (
          <EmptyState
            title="Nothing stacked yet"
            body="Swipe a card right on the board, log a habit on Today, or add a win above. Every one lands here."
          />
        ) : (
          sections.map((section) => (
            // Folded by default: the count in the summary is the proof, and
            // the pile above already carries the feeling. Open one when you
            // actually want to read what's in it.
            <details key={section} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-1 py-1.5 text-xs font-medium text-muted marker:hidden">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
                {groupByCategory ? (
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: categoryColor(slotByName.get(section)) }}
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">
                  {groupByCategory ? section : formatDay(section)}
                </span>
                <span className="shrink-0 tabular-nums">{grouped.get(section)!.length}</span>
              </summary>
              <ul className="mt-1.5 space-y-1.5">
                {grouped.get(section)!.map((entry) => (
                  <li
                    key={entry.id}
                    className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface py-2.5 pl-5 pr-4"
                  >
                    {/* Same stripe colour as the category wears on the board,
                        so a win is placeable at a glance. */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: categoryColor(entry.categorySlot) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-pretty">{entry.title}</span>
                      <span className="mt-0.5 block text-xs text-muted text-pretty">
                        {groupByCategory ? formatDay(entry.on) : entry.categoryName ?? ""}
                        {entry.note ? `${groupByCategory || entry.categoryName ? " · " : ""}${entry.note}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                      {/* The tier names the work whether it was finished once
                          or logged for a day — an atomic habit day reads
                          "Atomic", not the mechanism that recorded it. */}
                      {entry.tier
                        ? TIERS[entry.tier].label
                        : entry.kind === "habit"
                          ? "Habit"
                          : "Added"}
                    </span>
                    {entry.kind === "added" ? (
                      <form action={deleteEvidenceEntry.bind(null, entry.id.replace("added:", ""))}>
                        <button type="submit" aria-label="Remove evidence" className="text-muted">
                          ×
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}
      </section>

      <p className="mt-8 px-1 text-sm text-muted text-pretty">
        You want confidence? Stack evidence. You want change? Stack wins.
      </p>
    </Screen>
  );
}

function ViewTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`min-h-11 flex-1 rounded-xl border text-center text-sm leading-[2.75rem] ${
        active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"
      }`}
    >
      {label}
    </Link>
  );
}
