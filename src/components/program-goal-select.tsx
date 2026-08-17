"use client";

import { useState, useTransition } from "react";

import { setProgramGoal } from "@/lib/actions";

/**
 * Saves the moment you choose. The version that rode along with the edit
 * form's Save button lost its selection whenever anything re-rendered the
 * page, which is indistinguishable from the pairing refusing to save.
 */
export function ProgramGoalSelect({
  programId,
  goalId,
  goals,
}: {
  programId: string;
  goalId: string | null;
  goals: { id: string; title: string }[];
}) {
  const [value, setValue] = useState(goalId ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function change(next: string) {
    setValue(next);
    setSaved(false);
    startTransition(async () => {
      await setProgramGoal(programId, next);
      setSaved(true);
    });
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
          Which goal does it serve?
        </span>
        <select
          value={value}
          onChange={(event) => change(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
        >
          <option value="">Not attached to a goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>
      <p className="h-4 text-[11px] text-muted">
        {pending ? "Saving…" : saved ? "Saved" : ""}
      </p>
    </div>
  );
}
