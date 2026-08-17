"use client";

import { useState, useTransition } from "react";

import { saveGoalChecks, setBlockedBy } from "@/lib/actions";
import type { CheckRating, GoalRow } from "@/lib/database.types";

/**
 * Section 05's three checks. They save the moment you tap, because the
 * previous version needed a separate Save press and gave no feedback at all
 * until it happened — which is indistinguishable from being broken.
 */
const CHECKS: { key: Field; question: string; options: [CheckRating, string][] }[] = [
  {
    key: "check_alignment",
    question: "Does this align with the bigger vision?",
    options: [
      ["high", "Squarely"],
      ["mixed", "Partly"],
      ["low", "Not really"],
    ],
  },
  {
    key: "check_energy",
    question: "Does it excite you or drain you?",
    options: [
      ["high", "Excites"],
      ["mixed", "Neutral"],
      ["low", "Drains"],
    ],
  },
  {
    key: "check_impact",
    question: "Will it make a meaningful difference?",
    options: [
      ["high", "Big"],
      ["mixed", "Some"],
      ["low", "Little"],
    ],
  },
];

type Field = "check_alignment" | "check_energy" | "check_impact";
type Answers = Record<Field, CheckRating | null>;

export function GoalChecks({ goal }: { goal: GoalRow }) {
  const [answers, setAnswers] = useState<Answers>({
    check_alignment: goal.check_alignment,
    check_energy: goal.check_energy,
    check_impact: goal.check_impact,
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function choose(field: Field, value: CheckRating) {
    // Tapping the same answer again clears it, so a mis-tap is recoverable.
    const next: Answers = { ...answers, [field]: answers[field] === value ? null : value };
    setAnswers(next);
    setSaved(false);

    const form = new FormData();
    // All three go every time — the action writes the whole set.
    for (const key of ["check_alignment", "check_energy", "check_impact"] as Field[]) {
      if (next[key]) form.set(key, next[key]!);
    }
    startTransition(async () => {
      await saveGoalChecks(goal.id, form);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      {CHECKS.map((check) => (
        <fieldset key={check.key}>
          <legend className="mb-1.5 text-xs text-muted text-pretty">{check.question}</legend>
          <div className="flex gap-1.5">
            {check.options.map(([value, label]) => {
              const active = answers[check.key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(check.key, value)}
                  className={`min-h-11 flex-1 rounded-xl border text-xs ${
                    active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="h-4 text-right text-[11px] text-muted">
        {pending ? "Saving…" : saved ? "Saved" : ""}
      </p>
    </div>
  );
}

export function ChecksSummary({ goal }: { goal: GoalRow }) {
  const answered = [goal.check_alignment, goal.check_energy, goal.check_impact].filter(Boolean);
  if (answered.length === 0) return null;

  const label: Record<CheckRating, string> = { high: "High", mixed: "Mixed", low: "Low" };
  const tone: Record<CheckRating, string> = {
    high: "text-emerald-600",
    mixed: "text-muted",
    low: "text-tier-atomic",
  };

  const rows: [string, CheckRating | null][] = [
    ["Alignment", goal.check_alignment],
    ["Energy", goal.check_energy],
    ["Impact", goal.check_impact],
  ];

  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {rows.map(([name, value]) =>
        value ? (
          <div key={name} className="flex gap-1.5">
            <dt className="text-muted">{name}</dt>
            <dd className={tone[value]}>{label[value]}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

/** Same problem, same fix: choosing a prerequisite saves on change. */
export function BlockedBySelect({
  goal,
  options,
}: {
  goal: GoalRow;
  options: { id: string; title: string }[];
}) {
  const [value, setValue] = useState(goal.blocked_by ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(next: string) {
    const previous = value;
    setValue(next);
    setSaved(false);
    setError(null);

    const form = new FormData();
    form.set("blocked_by", next);
    startTransition(async () => {
      try {
        await setBlockedBy(goal.id, form);
        setSaved(true);
      } catch (cause) {
        // A rejected cycle must not leave the control showing a value that
        // was never stored.
        setValue(previous);
        setError(cause instanceof Error ? cause.message : "That didn't save.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(event) => change(event.target.value)}
        aria-label="This goal waits on"
        className="min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent"
      >
        <option value="">Nothing — this can run now</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
      <p className="h-4 text-[11px] text-muted">
        {pending ? "Saving…" : error ? <span className="text-tier-atomic">{error}</span> : saved ? "Saved" : ""}
      </p>
    </div>
  );
}
