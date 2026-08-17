import Link from "next/link";

import { CategorySelect, DateField, Field } from "@/components/goal-card";
import { EmptyState, Screen } from "@/components/screen";
import { addEvidenceEntry, deleteEvidenceEntry } from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { formatDay, getTimezone, recentDays, todayIn } from "@/lib/dates";
import { getCategories, getEvidence, type EvidenceEntry } from "@/lib/queries";
import { PULL_QUOTES, TIERS } from "@/lib/workbook";

const GRID_DAYS = 56;

export default async function EvidencePage({ searchParams }: PageProps<"/evidence">) {
  const params = await searchParams;
  const groupByCategory = params.by === "category";

  const timeZone = await getTimezone();
  const today = todayIn(timeZone);
  const [entries, categories] = await Promise.all([getEvidence(), getCategories()]);

  const countByDay = new Map<string, number>();
  for (const entry of entries) {
    countByDay.set(entry.on, (countByDay.get(entry.on) ?? 0) + 1);
  }

  const days = recentDays(today, GRID_DAYS);
  const busiest = Math.max(1, ...days.map((day) => countByDay.get(day) ?? 0));

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
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-5xl tabular-nums">{entries.length}</span>
        <span className="text-sm text-muted">
          {entries.length === 1 ? "win stacked" : "wins stacked"}
        </span>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Last eight weeks
        </h2>
        {/* Columns are weeks, rows are weekdays — dense enough to read the
            shape of a habit at a glance on a phone. */}
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {days.map((day) => {
            const count = countByDay.get(day) ?? 0;
            return (
              <div
                key={day}
                title={`${formatDay(day)} — ${count} ${count === 1 ? "win" : "wins"}`}
                className="aspect-square rounded-[3px] bg-accent"
                style={{ opacity: count === 0 ? 0.08 : 0.25 + 0.75 * (count / busiest) }}
              />
            );
          })}
        </div>
      </section>

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
        <ViewTab href="/evidence" label="By date" active={!groupByCategory} />
        <ViewTab href="/evidence?by=category" label="By category" active={groupByCategory} />
      </nav>

      <section className="mt-4 space-y-5">
        {sections.length === 0 ? (
          <EmptyState
            title="Nothing stacked yet"
            body="Swipe a card right on the board, log a habit on Today, or add a win above. Every one lands here."
          />
        ) : (
          sections.map((section) => (
            <div key={section}>
              <h3 className="mb-2 flex items-baseline justify-between px-1 text-xs font-medium text-muted">
                <span className="flex items-center gap-2">
                  {groupByCategory ? (
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: categoryColor(slotByName.get(section)) }}
                    />
                  ) : null}
                  <span
                    style={
                      groupByCategory
                        ? { color: categoryColor(slotByName.get(section)) }
                        : undefined
                    }
                  >
                    {groupByCategory ? section : formatDay(section)}
                  </span>
                </span>
                <span className="tabular-nums">{grouped.get(section)!.length}</span>
              </h3>
              <ul className="space-y-1.5">
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
                      {entry.kind === "finished" && entry.tier
                        ? TIERS[entry.tier].label
                        : entry.kind === "logged"
                          ? "Logged"
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
            </div>
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
