"use client";

import { useState, useTransition } from "react";

import { saveJournalEntry } from "@/lib/actions";

export const NORTH_STAR_KEY = "north_star";

/**
 * The identity statement everything on the board is supposed to serve. It sits
 * above the goals because it outranks them — and it saves on blur, so editing
 * it never depends on remembering to press anything.
 */
export function NorthStar({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function commit() {
    setEditing(false);
    if (value.trim() === initial.trim()) return;
    startTransition(async () => {
      await saveJournalEntry(NORTH_STAR_KEY, value);
    });
  }

  return (
    <section
      aria-label="North star"
      className="relative overflow-hidden rounded-2xl border border-accent/30 bg-accent/5 px-5 py-5"
    >
      {/* A soft bloom behind the type, so the card reads as lit rather than
          just tinted. Purely decorative. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
      />

      <p className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
          <path d="M12 2c.5 4.5 2.9 7 7.5 8-4.6 1-7 3.5-7.5 8-.5-4.5-2.9-7-7.5-8 4.6-1 7-3.5 7.5-8z" />
        </svg>
        North star
      </p>

      {editing ? (
        <textarea
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          rows={4}
          className="relative mt-2.5 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 font-serif text-lg leading-snug outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="relative mt-2.5 block w-full text-left font-serif text-[1.35rem] leading-snug text-balance"
        >
          {value || "Name who you're becoming."}
        </button>
      )}

      <p className="relative mt-2 h-4 text-[11px] text-muted">
        {pending ? "Saving…" : editing ? "Tap away to save" : "Tap to edit"}
      </p>
    </section>
  );
}
