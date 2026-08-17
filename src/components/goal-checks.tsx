import { saveGoalChecks } from "@/lib/actions";
import type { CheckRating, GoalRow } from "@/lib/database.types";

/**
 * Section 05's three checks. Answered on the way in, and worth re-reading at
 * review — a goal that drains you and changes little is the one to drop.
 */
const CHECKS: { name: string; question: string; options: [CheckRating, string][] }[] = [
  {
    name: "check_alignment",
    question: "Does this align with the bigger vision?",
    options: [
      ["high", "Squarely"],
      ["mixed", "Partly"],
      ["low", "Not really"],
    ],
  },
  {
    name: "check_energy",
    question: "Does it excite you or drain you?",
    options: [
      ["high", "Excites"],
      ["mixed", "Neutral"],
      ["low", "Drains"],
    ],
  },
  {
    name: "check_impact",
    question: "Will it make a meaningful difference?",
    options: [
      ["high", "Big"],
      ["mixed", "Some"],
      ["low", "Little"],
    ],
  },
];

export function GoalChecks({ goal, compact }: { goal: GoalRow; compact?: boolean }) {
  const current: Record<string, CheckRating | null> = {
    check_alignment: goal.check_alignment,
    check_energy: goal.check_energy,
    check_impact: goal.check_impact,
  };

  return (
    <form action={saveGoalChecks.bind(null, goal.id)} className="space-y-3">
      {CHECKS.map((check) => (
        <fieldset key={check.name}>
          <legend className="mb-1.5 text-xs text-muted text-pretty">{check.question}</legend>
          <div className="flex gap-1.5">
            {check.options.map(([value, label]) => {
              const active = current[check.name] === value;
              return (
                <label
                  key={value}
                  className={`min-h-11 flex-1 cursor-pointer rounded-xl border text-center text-xs leading-[2.75rem] ${
                    active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={check.name}
                    value={value}
                    defaultChecked={active}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button
        type="submit"
        className="min-h-11 w-full rounded-xl border border-border text-sm text-muted"
      >
        {compact ? "Save answers" : "Save the checks"}
      </button>
    </form>
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
