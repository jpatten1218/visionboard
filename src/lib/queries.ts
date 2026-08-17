import "server-only";

import { recentDays, todayIn, weekStartOf } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  AvoidanceItemRow,
  CategoryRow,
  EvidenceEntryRow,
  GoalCompletionRow,
  GoalRow,
  JournalEntryRow,
  ReadingListRow,
  WeeklyReviewRow,
} from "@/lib/database.types";

export type GoalNode = GoalRow & { children: GoalNode[]; category: CategoryRow | null };

export async function getCategories(): Promise<CategoryRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  fail("Loading categories", error);
  return (data ?? []) as CategoryRow[];
}

function fail(context: string, error: { message: string } | null): never | void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Macro goals with their micro and mini goals nested underneath. */
export async function getPyramid(): Promise<GoalNode[]> {
  const db = supabaseAdmin();
  const [goalsResult, categories] = await Promise.all([
    db
      .from("goals")
      .select("*")
      .in("tier", ["macro", "micro", "mini"])
      .neq("status", "archived")
      .order("sort_order")
      .order("created_at"),
    getCategories(),
  ]);
  fail("Loading the pyramid", goalsResult.error);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rows = (goalsResult.data ?? []) as GoalRow[];
  const byId = new Map<string, GoalNode>(
    rows.map((row) => [
      row.id,
      { ...row, children: [], category: row.category_id ? categoryById.get(row.category_id) ?? null : null },
    ]),
  );
  const roots: GoalNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    // A finished macro goal leaves the board for the evidence pile — the
    // workbook's board empties as you become the person who cleared it.
    // Finished micros and minis stay visible under their parent as progress.
    else if (node.tier === "macro" && node.status === "active") roots.push(node);
  }

  // Grouped by category so swiping across the board moves through one area of
  // life at a time. Uncategorised macros trail the end.
  const rank = new Map(categories.map((category, index) => [category.id, index]));
  return roots.sort((a, b) => {
    const aRank = a.category_id ? rank.get(a.category_id) ?? Infinity : Infinity;
    const bRank = b.category_id ? rank.get(b.category_id) ?? Infinity : Infinity;
    return aRank - bRank || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
  });
}

/** One macro goal with its micro goals and their minis, for the detail screen. */
export async function getMacroGoal(id: string): Promise<GoalNode | null> {
  const db = supabaseAdmin();
  // Parameterised equality rather than an interpolated `.or()` filter, so a
  // hand-crafted URL cannot smuggle PostgREST syntax into the query.
  const [macroResult, microResult, categories] = await Promise.all([
    db.from("goals").select("*").eq("id", id).eq("tier", "macro").maybeSingle(),
    db
      .from("goals")
      .select("*")
      .eq("parent_id", id)
      .neq("status", "archived")
      .order("sort_order")
      .order("created_at"),
    getCategories(),
  ]);
  fail("Loading the goal", macroResult.error);
  fail("Loading micro goals", microResult.error);

  const macro = macroResult.data as GoalRow | null;
  if (!macro) return null;

  const micros = (microResult.data ?? []) as GoalRow[];

  // Minis hang off the micros, so they need a second round trip.
  const { data: miniRows, error: miniError } = micros.length
    ? await db
        .from("goals")
        .select("*")
        .in("parent_id", micros.map((micro) => micro.id))
        .neq("status", "archived")
        .order("sort_order")
        .order("created_at")
    : { data: [], error: null };
  fail("Loading mini goals", miniError);

  const category = macro.category_id
    ? categories.find((entry) => entry.id === macro.category_id) ?? null
    : null;

  return {
    ...macro,
    category,
    children: micros.map((micro) => ({
      ...micro,
      category: null,
      children: ((miniRows ?? []) as GoalRow[])
        .filter((mini) => mini.parent_id === micro.id)
        .map((mini) => ({ ...mini, category: null, children: [] })),
    })),
  };
}

export async function getUniversalGoals(): Promise<GoalRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("goals")
    .select("*")
    .eq("tier", "universal")
    .neq("status", "archived")
    .order("sort_order");
  fail("Loading universal goals", error);
  return (data ?? []) as GoalRow[];
}

export type TodayBoard = {
  today: string;
  atomic: (GoalRow & { doneToday: boolean; streak: number })[];
  minis: GoalRow[];
};

/** The daily screen: atomic non-negotiables plus today's open mini goals. */
export async function getToday(timeZone: string): Promise<TodayBoard> {
  const db = supabaseAdmin();
  const today = todayIn(timeZone);
  // 60 days is enough history to render any streak worth showing.
  const window = recentDays(today, 60);

  const [goalsResult, completionsResult] = await Promise.all([
    db
      .from("goals")
      .select("*")
      .in("tier", ["atomic", "mini"])
      .eq("status", "active")
      .order("sort_order")
      .order("created_at"),
    db.from("goal_completions").select("*").gte("completed_on", window[0]),
  ]);
  fail("Loading today's goals", goalsResult.error);
  fail("Loading completions", completionsResult.error);

  const goals = (goalsResult.data ?? []) as GoalRow[];
  const completions = (completionsResult.data ?? []) as GoalCompletionRow[];

  const doneByGoal = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = doneByGoal.get(completion.goal_id) ?? new Set<string>();
    set.add(completion.completed_on);
    doneByGoal.set(completion.goal_id, set);
  }

  const atomic = goals
    .filter((goal) => goal.tier === "atomic")
    .map((goal) => {
      const done = doneByGoal.get(goal.id) ?? new Set<string>();
      return { ...goal, doneToday: done.has(today), streak: streakEndingAt(done, today) };
    });

  return { today, atomic, minis: goals.filter((goal) => goal.tier === "mini") };
}

/**
 * Consecutive days logged, counting back from today. Today not being logged
 * yet does not break the streak — the day isn't over.
 */
function streakEndingAt(done: Set<string>, today: string): number {
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!done.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (done.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export type EvidenceEntry = {
  id: string;
  title: string;
  tier: GoalRow["tier"] | null;
  on: string;
  note: string | null;
  categoryName: string | null;
  kind: "finished" | "logged" | "added";
};

/**
 * Part 05 — the proof pile. Three sources: goals you finished, habit days you
 * logged, and wins you added by hand that were never on the board.
 */
export async function getEvidence(limit = 200): Promise<EvidenceEntry[]> {
  const db = supabaseAdmin();
  const [finishedResult, loggedResult, addedResult, allGoalsResult, categories] = await Promise.all([
    db
      .from("goals")
      .select("*")
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(limit),
    db
      .from("goal_completions")
      .select("*, goals(title, tier)")
      .order("completed_on", { ascending: false })
      .limit(limit),
    db
      .from("evidence_entries")
      .select("*")
      .order("happened_on", { ascending: false })
      .limit(limit),
    // Just enough of every goal to walk a micro or mini up to the macro that
    // carries the category.
    db.from("goals").select("id, parent_id, category_id"),
    getCategories(),
  ]);
  fail("Loading finished goals", finishedResult.error);
  fail("Loading logged days", loggedResult.error);
  fail("Loading added evidence", addedResult.error);
  fail("Loading the goal graph", allGoalsResult.error);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  type GraphRow = { id: string; parent_id: string | null; category_id: string | null };
  const graph = new Map(
    ((allGoalsResult.data ?? []) as GraphRow[]).map((row) => [row.id, row]),
  );

  /** A goal's own category, or the nearest ancestor's. */
  function categoryOfGoal(goalId: string): string | null {
    let cursor = graph.get(goalId);
    // Bounded by the pyramid's depth; the guard is against a cyclic parent.
    for (let depth = 0; cursor && depth < 8; depth++) {
      if (cursor.category_id) return categoryName.get(cursor.category_id) ?? null;
      cursor = cursor.parent_id ? graph.get(cursor.parent_id) : undefined;
    }
    return null;
  }

  const finished: EvidenceEntry[] = ((finishedResult.data ?? []) as GoalRow[]).map((goal) => ({
    id: `goal:${goal.id}`,
    title: goal.title,
    tier: goal.tier,
    on: (goal.completed_at ?? goal.updated_at).slice(0, 10),
    note: goal.detail,
    categoryName: categoryOfGoal(goal.id),
    kind: "finished",
  }));

  type JoinedCompletion = GoalCompletionRow & {
    goals: { title: string; tier: GoalRow["tier"] } | null;
  };
  // The hand-written Database type carries no relationship metadata, so the
  // embedded `goals(...)` select has to be asserted rather than inferred.
  const logged: EvidenceEntry[] = ((loggedResult.data ?? []) as unknown as JoinedCompletion[])
    .filter((row) => row.goals !== null)
    .map((row) => ({
      id: `log:${row.id}`,
      title: row.goals!.title,
      tier: row.goals!.tier,
      on: row.completed_on,
      note: row.note,
      categoryName: categoryOfGoal(row.goal_id),
      kind: "logged",
    }));

  const added: EvidenceEntry[] = ((addedResult.data ?? []) as EvidenceEntryRow[]).map((entry) => ({
    id: `added:${entry.id}`,
    title: entry.title,
    tier: null,
    on: entry.happened_on,
    note: entry.note,
    categoryName: entry.category_id ? categoryName.get(entry.category_id) ?? null : null,
    kind: "added",
  }));

  return [...finished, ...logged, ...added]
    .sort((a, b) => b.on.localeCompare(a.on))
    .slice(0, limit);
}

export type AvoidanceBoard = {
  items: AvoidanceItemRow[];
  /**
   * Part 04's rule: one finished macro goal buys one promotion off the list.
   * Promotions already spent are subtracted, so the credit cannot be reused.
   */
  creditsAvailable: number;
  macroGoalsFinished: number;
};

export async function getAvoidanceBoard(): Promise<AvoidanceBoard> {
  const db = supabaseAdmin();
  const [itemsResult, finishedMacrosResult] = await Promise.all([
    db
      .from("avoidance_items")
      .select("*")
      .order("promoted_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false }),
    db.from("goals").select("id").eq("tier", "macro").eq("status", "done"),
  ]);
  fail("Loading the avoidance list", itemsResult.error);
  fail("Counting finished macro goals", finishedMacrosResult.error);

  const items = (itemsResult.data ?? []) as AvoidanceItemRow[];
  const macroGoalsFinished = (finishedMacrosResult.data ?? []).length;
  const spent = items.filter((item) => item.promoted_at !== null).length;

  return {
    items,
    macroGoalsFinished,
    creditsAvailable: Math.max(0, macroGoalsFinished - spent),
  };
}

export type WeekSummary = {
  weekStart: string;
  days: string[];
  review: WeeklyReviewRow | null;
  /** Logged habit-days over the week's opportunities, as a percentage. */
  consistencyPct: number;
  perGoal: { goal: GoalRow; days: Set<string> }[];
};

export async function getWeek(timeZone: string): Promise<WeekSummary> {
  const db = supabaseAdmin();
  const today = todayIn(timeZone);
  const weekStart = weekStartOf(today);
  const days = recentDays(today, 7).filter((day) => day >= weekStart);

  const [goalsResult, completionsResult, reviewResult] = await Promise.all([
    db.from("goals").select("*").eq("tier", "atomic").eq("status", "active").order("sort_order"),
    db.from("goal_completions").select("*").gte("completed_on", weekStart).lte("completed_on", today),
    db.from("weekly_reviews").select("*").eq("week_start", weekStart).maybeSingle(),
  ]);
  fail("Loading weekly goals", goalsResult.error);
  fail("Loading weekly completions", completionsResult.error);
  fail("Loading the weekly review", reviewResult.error);

  const goals = (goalsResult.data ?? []) as GoalRow[];
  const completions = (completionsResult.data ?? []) as GoalCompletionRow[];

  const perGoal = goals.map((goal) => ({
    goal,
    days: new Set(
      completions.filter((completion) => completion.goal_id === goal.id).map((c) => c.completed_on),
    ),
  }));

  // Only days that have already happened count as opportunities — a Tuesday
  // review should not read as 40% just because Thursday hasn't arrived.
  const opportunities = goals.length * days.length;
  const hits = perGoal.reduce((total, entry) => total + entry.days.size, 0);

  return {
    weekStart,
    days,
    review: (reviewResult.data as WeeklyReviewRow | null) ?? null,
    consistencyPct: opportunities === 0 ? 0 : Math.round((hits / opportunities) * 100),
    perGoal,
  };
}

export async function getJournal(): Promise<Map<string, string>> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("journal_entries").select("*");
  fail("Loading journal entries", error);
  return new Map(
    ((data ?? []) as JournalEntryRow[]).map((row) => [row.prompt_key, row.response ?? ""]),
  );
}

export async function getReadingList(): Promise<ReadingListRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("reading_list")
    .select("*")
    .order("sort_order")
    .order("created_at");
  fail("Loading the reading list", error);
  return (data ?? []) as ReadingListRow[];
}
