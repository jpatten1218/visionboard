import "server-only";

import { recentDays, todayIn, weekStartOf } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  AvoidanceItemRow,
  CategoryRow,
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
    else if (node.tier === "macro") roots.push(node);
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
  tier: GoalRow["tier"];
  on: string;
  note: string | null;
  kind: "finished" | "logged";
};

/** Part 05 — the proof pile. Finished goals and every logged habit day. */
export async function getEvidence(limit = 200): Promise<EvidenceEntry[]> {
  const db = supabaseAdmin();
  const [finishedResult, loggedResult] = await Promise.all([
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
  ]);
  fail("Loading finished goals", finishedResult.error);
  fail("Loading logged days", loggedResult.error);

  const finished: EvidenceEntry[] = ((finishedResult.data ?? []) as GoalRow[]).map((goal) => ({
    id: `goal:${goal.id}`,
    title: goal.title,
    tier: goal.tier,
    on: (goal.completed_at ?? goal.updated_at).slice(0, 10),
    note: goal.detail,
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
      kind: "logged",
    }));

  return [...finished, ...logged].sort((a, b) => b.on.localeCompare(a.on)).slice(0, limit);
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
