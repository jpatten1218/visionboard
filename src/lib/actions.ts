"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { PALETTE_SLOTS } from "@/lib/category-color";
import type { GoalDomain, GoalTier, IdeaPriority } from "@/lib/database.types";
import { TIMEZONE_COOKIE, getTimezone, isValidTimezone, todayIn, weekStartOf } from "@/lib/dates";
import { getAvoidanceBoard } from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase";

const A_YEAR = 60 * 60 * 24 * 365;

function refresh() {
  // Every screen reads from the same handful of tables, so a mutation
  // anywhere can change what any of them render.
  revalidatePath("/", "layout");
}

function assertOk(context: string, error: { message: string } | null) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function text(value: FormDataEntryValue | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

export async function rememberTimezone(timeZone: string) {
  if (!isValidTimezone(timeZone)) return;
  (await cookies()).set(TIMEZONE_COOKIE, timeZone, {
    maxAge: A_YEAR,
    sameSite: "lax",
    path: "/",
  });
}

export async function createGoal(formData: FormData) {
  const title = text(formData.get("title"));
  if (!title) return;

  const tier = formData.get("tier") as GoalTier;
  const parentId = text(formData.get("parent_id"));

  const db = supabaseAdmin();
  const { error } = await db.from("goals").insert({
    tier,
    title,
    parent_id: parentId,
    category_id: text(formData.get("category_id")),
    target_on: text(formData.get("target_on")),
    detail: text(formData.get("detail")),
    floor: text(formData.get("floor")),
    ceiling: text(formData.get("ceiling")),
    domain: (text(formData.get("domain")) as GoalDomain | null) ?? "general",
    // Atomic goals are habits: they are logged per day, never finished once.
    is_recurring: tier === "atomic",
  });
  assertOk("Creating the goal", error);
  refresh();
}

export async function updateGoal(formData: FormData) {
  const id = text(formData.get("id"));
  const title = text(formData.get("title"));
  if (!id || !title) return;

  const db = supabaseAdmin();
  const { error } = await db
    .from("goals")
    .update({
      title,
      category_id: text(formData.get("category_id")),
      target_on: text(formData.get("target_on")),
      detail: text(formData.get("detail")),
      floor: text(formData.get("floor")),
      ceiling: text(formData.get("ceiling")),
    })
    .eq("id", id);
  assertOk("Updating the goal", error);
  refresh();
}

/** Moves a one-time goal (macro, micro, mini) into the evidence pile. */
export async function completeGoal(id: string) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("goals")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_recurring", false);
  assertOk("Completing the goal", error);
  refresh();
}

export async function reopenGoal(id: string) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("goals")
    .update({ status: "active", completed_at: null })
    .eq("id", id);
  assertOk("Reopening the goal", error);
  refresh();
}

export async function deleteGoal(id: string) {
  const db = supabaseAdmin();
  // Children cascade, which matches the board: pulling a macro pulls its
  // micros and minis with it.
  const { error } = await db.from("goals").delete().eq("id", id);
  assertOk("Deleting the goal", error);
  refresh();
}

/**
 * Logs (or un-logs) a habit for a single day. Idempotent per goal per day,
 * enforced by a unique constraint rather than a read-then-write race.
 */
export async function toggleHabitDay(goalId: string, day: string, hitCeiling = false) {
  const db = supabaseAdmin();
  const { data: existing, error: readError } = await db
    .from("goal_completions")
    .select("id, hit_ceiling")
    .eq("goal_id", goalId)
    .eq("completed_on", day)
    .maybeSingle();
  assertOk("Reading the day's log", readError);

  if (!existing) {
    const { error } = await db
      .from("goal_completions")
      .insert({ goal_id: goalId, completed_on: day, hit_ceiling: hitCeiling });
    assertOk("Logging the day", error);
  } else if (hitCeiling && !existing.hit_ceiling) {
    // Tapping again after clearing the floor promotes the day to the ceiling
    // rather than wiping the log.
    const { error } = await db
      .from("goal_completions")
      .update({ hit_ceiling: true })
      .eq("id", existing.id);
    assertOk("Marking the ceiling", error);
  } else {
    const { error } = await db.from("goal_completions").delete().eq("id", existing.id);
    assertOk("Clearing the day", error);
  }
  refresh();
}

/** A win that was never on the board. Part 05's pile takes those too. */
export async function addEvidenceEntry(formData: FormData) {
  const title = text(formData.get("title"));
  if (!title) return;

  const timeZone = await getTimezone();
  const db = supabaseAdmin();
  const { error } = await db.from("evidence_entries").insert({
    title,
    note: text(formData.get("note")),
    category_id: text(formData.get("category_id")),
    happened_on: text(formData.get("happened_on")) ?? todayIn(timeZone),
  });
  assertOk("Adding the evidence", error);
  refresh();
}

export async function deleteEvidenceEntry(id: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("evidence_entries").delete().eq("id", id);
  assertOk("Removing the evidence", error);
  refresh();
}

export async function addCategory(formData: FormData) {
  const name = text(formData.get("name"));
  if (!name) return;

  const db = supabaseAdmin();
  const { data: existing, error: readError } = await db
    .from("categories")
    .select("sort_order, color_slot")
    .order("sort_order", { ascending: false });
  assertOk("Reading category order", readError);

  const rows = existing ?? [];
  // Slots are handed out in the palette's fixed order. Past eight categories
  // they repeat — the name is always shown alongside, so colour is never the
  // only thing telling two apart.
  const used = new Set(rows.map((row) => row.color_slot));
  const nextSlot =
    [1, 2, 3, 4, 5, 6, 7, 8].find((slot) => !used.has(slot)) ?? (rows.length % PALETTE_SLOTS) + 1;

  const { error } = await db.from("categories").insert({
    name,
    sort_order: (rows[0]?.sort_order ?? 0) + 1,
    color_slot: nextSlot,
  });
  // A duplicate name is a slip, not a failure worth throwing an error page for.
  if (error && !error.message.includes("duplicate key")) {
    assertOk("Adding the category", error);
  }
  refresh();
}

export async function renameCategory(id: string, formData: FormData) {
  const name = text(formData.get("name"));
  if (!name) return;

  const db = supabaseAdmin();
  const { error } = await db.from("categories").update({ name }).eq("id", id);
  assertOk("Renaming the category", error);
  refresh();
}

/** Goals keep their place on the board; they just lose the label. */
export async function deleteCategory(id: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("categories").delete().eq("id", id);
  assertOk("Removing the category", error);
  refresh();
}

export async function addAvoidanceItem(formData: FormData) {
  const idea = text(formData.get("idea"));
  if (!idea) return;

  const db = supabaseAdmin();
  const { error } = await db.from("avoidance_items").insert({
    idea,
    priority: (text(formData.get("priority")) as IdeaPriority | null) ?? "medium",
    revisit_on: text(formData.get("revisit_on")),
    replaces: text(formData.get("replaces")),
  });
  assertOk("Parking the idea", error);
  refresh();
}

/**
 * Part 04's rule, enforced rather than trusted: an idea only leaves the list
 * when a finished macro goal has paid for it.
 */
export async function promoteAvoidanceItem(id: string) {
  const { creditsAvailable } = await getAvoidanceBoard();
  if (creditsAvailable < 1) {
    throw new Error("Finish a macro goal before pulling anything off the Avoidance List.");
  }

  const db = supabaseAdmin();
  const { data: item, error: readError } = await db
    .from("avoidance_items")
    .select("*")
    .eq("id", id)
    .is("promoted_at", null)
    .maybeSingle();
  assertOk("Finding the parked idea", readError);
  if (!item) return;

  const { data: goal, error: insertError } = await db
    .from("goals")
    .insert({ tier: "macro", title: item.idea, detail: item.replaces })
    .select("id")
    .single();
  assertOk("Promoting the idea to a macro goal", insertError);

  const { error: updateError } = await db
    .from("avoidance_items")
    .update({ promoted_at: new Date().toISOString(), promoted_goal_id: goal!.id })
    .eq("id", id);
  assertOk("Marking the idea promoted", updateError);
  refresh();
}

export async function deleteAvoidanceItem(id: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("avoidance_items").delete().eq("id", id);
  assertOk("Removing the parked idea", error);
  refresh();
}

export async function saveJournalEntry(promptKey: string, response: string) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("journal_entries")
    .upsert({ prompt_key: promptKey, response: response.trim() || null }, { onConflict: "owner_id,prompt_key" });
  assertOk("Saving the journal entry", error);
  refresh();
}

export async function saveWeeklyReview(formData: FormData) {
  const timeZone = await getTimezone();
  const weekStart = text(formData.get("week_start")) ?? weekStartOf(todayIn(timeZone));

  const db = supabaseAdmin();
  const { error } = await db
    .from("weekly_reviews")
    .upsert({ week_start: weekStart, note: text(formData.get("note")) }, { onConflict: "owner_id,week_start" });
  assertOk("Saving the weekly review", error);
  refresh();
}

export async function addBook(formData: FormData) {
  const title = text(formData.get("title"));
  if (!title) return;

  const db = supabaseAdmin();
  const { error } = await db
    .from("reading_list")
    .insert({ title, why_it_matters: text(formData.get("why_it_matters")) });
  assertOk("Adding the book", error);
  refresh();
}

export async function toggleBookFinished(id: string, finished: boolean) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("reading_list")
    .update({ finished_at: finished ? new Date().toISOString() : null })
    .eq("id", id);
  assertOk("Updating the book", error);
  refresh();
}

export async function deleteBook(id: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("reading_list").delete().eq("id", id);
  assertOk("Removing the book", error);
  refresh();
}
