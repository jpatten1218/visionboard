import { DateField, Field } from "@/components/goal-card";
import { addProgram, updateProgram } from "@/lib/actions";
import type { ProgramCadence, ProgramRow, ProgramStatus } from "@/lib/database.types";
import { CADENCE_LABEL, STATUS_LABEL } from "@/lib/programs";

const CADENCES = Object.keys(CADENCE_LABEL) as ProgramCadence[];
const STATUSES = Object.keys(STATUS_LABEL) as ProgramStatus[];

const SELECT_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-surface-sunk px-3 outline-none focus:border-accent";

/**
 * Cost is asked for twice on purpose: the exact figure when you have it, and
 * a one-to-five scale for when you only remember that it stung.
 */
export function ProgramForm({
  goals,
  program,
}: {
  goals: { id: string; title: string }[];
  program?: ProgramRow;
}) {
  const action = program ? updateProgram.bind(null, program.id) : addProgram;

  return (
    <form action={action} className="space-y-2">
      <Field name="name" label="Program" required defaultValue={program?.name} placeholder="Social Academy" />
      <Field
        name="provider"
        label="Who runs it"
        defaultValue={program?.provider ?? ""}
        placeholder="Optional"
      />

      <div className="grid grid-cols-2 gap-2">
        <Field
          name="cost"
          label="What it cost"
          defaultValue={program?.cost != null ? String(program.cost) : ""}
          placeholder="$1,200"
        />
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
            Or how much it stung
          </span>
          <select
            name="cost_tier"
            defaultValue={program?.cost_tier != null ? String(program.cost_tier) : ""}
            className={SELECT_CLASS}
          >
            <option value="">—</option>
            <option value="1">$</option>
            <option value="2">$$</option>
            <option value="3">$$$</option>
            <option value="4">$$$$</option>
            <option value="5">$$$$$</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
          What it asks of you
        </span>
        <select name="cadence" defaultValue={program?.cadence ?? "self_paced"} className={SELECT_CLASS}>
          {CADENCES.map((cadence) => (
            <option key={cadence} value={cadence}>
              {CADENCE_LABEL[cadence]}
            </option>
          ))}
        </select>
      </label>

      <Field
        name="commitment"
        label="The actual commitment"
        defaultValue={program?.commitment ?? ""}
        placeholder="Tuesday 7pm call, two retreats a year"
      />

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
          Which goal does it serve?
        </span>
        <select name="goal_id" defaultValue={program?.goal_id ?? ""} className={SELECT_CLASS}>
          <option value="">Nothing on the board yet</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <DateField name="started_on" label="From" defaultValue={program?.started_on ?? ""} />
        <DateField name="ends_on" label="To" defaultValue={program?.ends_on ?? ""} />
      </div>
      <label className="flex min-h-11 items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="evergreen"
          defaultChecked={program?.evergreen ?? false}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="text-pretty">
          Evergreen — no end date
          <span className="block text-xs text-muted">
            Lifetime access or an open-ended membership. Clears the To date.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Status</span>
        <select name="status" defaultValue={program?.status ?? "active"} className={SELECT_CLASS}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>

      <Field name="url" label="Where to access it" defaultValue={program?.url ?? ""} placeholder="https://" />
      <Field name="notes" label="Notes" defaultValue={program?.notes ?? ""} />

      <button
        type="submit"
        className="min-h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-fg"
      >
        {program ? "Save changes" : "Add program"}
      </button>
    </form>
  );
}
