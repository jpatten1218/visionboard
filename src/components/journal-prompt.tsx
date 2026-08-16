"use client";

import { useState, useTransition } from "react";

import { saveJournalEntry } from "@/lib/actions";
import type { Prompt } from "@/lib/workbook";

/**
 * Saves on blur rather than behind a button — these are long-form answers and
 * losing one to a stray back-swipe would be worse than an extra write.
 */
export function JournalPrompt({ prompt, initial }: { prompt: Prompt; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function commit() {
    if (value === initial && !saved) return;
    startTransition(async () => {
      await saveJournalEntry(prompt.key, value);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="leading-snug text-pretty">{prompt.question}</p>
      {prompt.hint ? <p className="mt-1 text-xs text-muted text-pretty">{prompt.hint}</p> : null}
      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
        onBlur={commit}
        rows={3}
        placeholder="Get crystal clear."
        className="mt-2 w-full resize-y rounded-xl border border-border bg-surface-sunk px-3 py-2 outline-none focus:border-accent"
      />
      <p className="h-4 text-right text-[11px] text-muted">
        {pending ? "Saving…" : saved ? "Saved" : ""}
      </p>
    </div>
  );
}
