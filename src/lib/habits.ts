import type { HabitRepeat, HabitRow, HabitSlot } from "@/lib/database.types";

export const SLOT_LABEL: Record<HabitSlot, string> = {
  anytime: "Anytime",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const REPEAT_LABEL: Record<HabitRepeat, string> = {
  daily: "Every day",
  weekdays: "Chosen days",
};

/** 0 = Sunday, matching `Date.getUTCDay()`. */
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeRepeat(habit: Pick<HabitRow, "repeat_kind" | "weekdays">): string {
  if (habit.repeat_kind === "daily") return "Every day";
  const days = [...habit.weekdays].sort((a, b) => a - b);
  if (days.length === 7) return "Every day";
  // Weekdays and weekends are worth naming rather than listing.
  if (days.length === 5 && days.every((day) => day >= 1 && day <= 5)) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return days.map((day) => DAY_NAMES[day]).join(", ");
}

/** Whether the habit asks anything of you on the given date. */
export function isDueOn(
  habit: Pick<HabitRow, "repeat_kind" | "weekdays" | "started_on" | "ends_on">,
  isoDate: string,
): boolean {
  if (isoDate < habit.started_on) return false;
  if (habit.ends_on && isoDate > habit.ends_on) return false;
  if (habit.repeat_kind === "daily") return true;
  return habit.weekdays.includes(new Date(`${isoDate}T00:00:00Z`).getUTCDay());
}
