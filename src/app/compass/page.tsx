import { AddGoalForm } from "@/components/add-goal-form";
import { Field } from "@/components/goal-card";
import { JournalPrompt } from "@/components/journal-prompt";
import { Screen } from "@/components/screen";
import { addBook, deleteBook, saveWeeklyReview, toggleBookFinished } from "@/lib/actions";
import { formatDay, getTimezone } from "@/lib/dates";
import { getJournal, getReadingList, getUniversalGoals, getWeek } from "@/lib/queries";
import { DIRECTION_PROMPTS, INQUIRY_PROMPTS, PULL_QUOTES } from "@/lib/workbook";

export default async function CompassPage() {
  const timeZone = await getTimezone();
  const [universal, week, journal, books] = await Promise.all([
    getUniversalGoals(),
    getWeek(timeZone),
    getJournal(),
    getReadingList(),
  ]);

  return (
    <Screen eyebrow="Part 01" title="Define your direction" quote={PULL_QUOTES.direction}>
      <section>
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-tier-universal">
          Universal goals — your compass
        </h2>
        <ul className="space-y-2">
          {universal.map((goal) => (
            <li key={goal.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
              <p className="leading-snug text-pretty">{goal.title}</p>
              {goal.detail ? (
                <p className="mt-1 text-sm text-muted text-pretty">{goal.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-muted text-pretty">
          These aren&apos;t checkboxes — they are directions. You don&apos;t finish them. You live
          them.
        </p>
        <div className="mt-3">
          <AddGoalForm tier="universal" label="Universal goal" />
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Part 05 — this week
        </h2>
        <div className="rounded-2xl border border-border bg-surface px-4 py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl tabular-nums">{week.consistencyPct}%</span>
            <span className="text-sm text-muted">consistent since {formatDay(week.weekStart)}</span>
          </div>

          {week.perGoal.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {week.perGoal.map(({ goal, days }) => (
                <li key={goal.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{goal.title}</span>
                  <span className="flex shrink-0 gap-1">
                    {week.days.map((day) => (
                      <span
                        key={day}
                        title={formatDay(day)}
                        className={`h-4 w-4 rounded-[3px] ${
                          days.has(day) ? "bg-accent" : "bg-surface-sunk"
                        }`}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted text-pretty">
              Add atomic habits on Today and this fills in.
            </p>
          )}

          <form action={saveWeeklyReview} className="mt-4">
            <input type="hidden" name="week_start" value={week.weekStart} />
            <textarea
              name="note"
              defaultValue={week.review?.note ?? ""}
              rows={2}
              placeholder="Skipped Friday, subbed walks."
              className="w-full resize-y rounded-xl border border-border bg-surface-sunk px-3 py-2 outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="mt-2 min-h-11 w-full rounded-xl border border-border text-sm"
            >
              Save this week&apos;s note
            </button>
          </form>

          <p className="mt-3 text-xs text-muted text-pretty">
            If you were 50% consistent this week, celebrate it. Then aim for 55%.
          </p>
        </div>
      </section>

      <section className="mt-9 space-y-2">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Journal prompts
        </h2>
        {DIRECTION_PROMPTS.map((prompt) => (
          <JournalPrompt key={prompt.key} prompt={prompt} initial={journal.get(prompt.key) ?? ""} />
        ))}
      </section>

      <section className="mt-9 space-y-2">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Self-inquiry
        </h2>
        {INQUIRY_PROMPTS.map((prompt) => (
          <JournalPrompt key={prompt.key} prompt={prompt} initial={journal.get(prompt.key) ?? ""} />
        ))}
        <p className="px-1 text-xs text-muted text-pretty">
          Get honest. Build strategies around your known hazards.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Books for alignment
        </h2>
        <ul className="space-y-2">
          {books.map((book) => (
            <li
              key={book.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <form action={toggleBookFinished.bind(null, book.id, book.finished_at === null)}>
                <button
                  type="submit"
                  aria-label={book.finished_at ? "Mark unread" : "Mark finished"}
                  className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 ${
                    book.finished_at ? "border-accent bg-accent text-accent-fg" : "border-border"
                  }`}
                >
                  {book.finished_at ? (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>
              </form>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug text-pretty">{book.title}</span>
                {book.why_it_matters ? (
                  <span className="mt-0.5 block text-sm text-muted text-pretty">
                    {book.why_it_matters}
                  </span>
                ) : null}
              </span>
              <form action={deleteBook.bind(null, book.id)}>
                <button type="submit" aria-label="Remove book" className="px-1 text-muted">
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>

        <details className="mt-3 rounded-2xl border border-dashed border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-muted marker:hidden">
            + Add a book
          </summary>
          <form action={addBook} className="space-y-2 border-t border-border px-4 py-3">
            <Field name="title" label="Title" required />
            <Field name="why_it_matters" label="Why it matters" />
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
            >
              Add
            </button>
          </form>
        </details>
      </section>

      <p className="mt-9 border-l-2 border-accent pl-3 text-sm italic text-muted text-pretty">
        {PULL_QUOTES.responsibility}
      </p>
      <p className="mt-4 px-1 font-serif text-xl">You&apos;re not dead yet. So live like it.</p>
    </Screen>
  );
}
