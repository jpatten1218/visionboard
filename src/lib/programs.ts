import type { ProgramCadence, ProgramStatus } from "@/lib/database.types";

/** A program untouched for this long has quietly become a sunk cost. */
export const IDLE_AFTER_DAYS = 30;

export const CADENCE_LABEL: Record<ProgramCadence, string> = {
  daily: "Daily",
  weekly: "Weekly call",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  in_person: "Retreat / in person",
  self_paced: "Self-paced",
  none: "No set commitment",
};

/** Roughly how many times a month the commitment asks something of you. */
export const CADENCE_PER_MONTH: Record<ProgramCadence, number> = {
  daily: 30,
  weekly: 4,
  biweekly: 2,
  monthly: 1,
  quarterly: 0.33,
  in_person: 0.25,
  self_paced: 0,
  none: 0,
};

export const STATUS_LABEL: Record<ProgramStatus, string> = {
  active: "Active",
  completed: "Completed",
  lapsed: "Lapsed",
  not_started: "Never started",
};

/** `$$$` — the shorthand for "it hurt this much" when the receipt is gone. */
export function costTierLabel(tier: number | null): string {
  if (!tier) return "";
  return "$".repeat(Math.max(1, Math.min(5, tier)));
}

export function formatMoney(amount: number | null): string {
  if (amount === null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
