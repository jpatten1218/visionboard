import "server-only";

import {
  daysBetween,
  localDateOf,
  recentDays,
  todayIn,
  weekEndOf,
  weekStartOf,
} from "@/lib/dates";
import { CADENCE_PER_MONTH, IDLE_AFTER_DAYS } from "@/lib/programs";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";
import type {
  AvoidanceItemRow,
  CategoryRow,
  EvidenceEntryRow,
  GoalCompletionRow,
  GoalRow,
  JournalEntryRow,
  ProgramEngagementRow,
  ProgramRow,
  ReadingListRow,
  WeeklyReviewRow,
} from "@/lib/database.types";

export type GoalNode = GoalRow & {
  children: GoalNode[];
  category: CategoryRow | null;
  /** Short-lived URL for `image_path`; the bucket is private. */
  imageUrl?: string | null;
  /** Last date anything under this goal was finished, or when it was written. */
  lastMovedOn?: string;
  /** Days since that, once past the threshold. Null means it is moving. */
  stalledDays?: number | null;
  /** Title of the goal this one waits on, when it waits on one. */
  blockedByTitle?: string | null;
};

export type MacroStages = {
  focus: GoalNode[];
  dreams: GoalRow[];
  shelved: GoalRow[];
};

/** A macro goal with nothing finished under it for this long has stalled. */
export const STALLED_AFTER_DAYS = 30;

/**
 * Signed URLs for private bucket objects, in one round trip. Missing or
 * failed paths simply come back absent rather than breaking the page.
 */
async function signImages(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const db = supabaseAdmin();
  // An hour is long enough for a session without minting near-permanent links.
  const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUrls(unique, 3600);
  if (error) return new Map();

  const pairs: [string, string][] = [];
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) pairs.push([entry.path, entry.signedUrl]);
  }
  return new Map(pairs);
}

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
export async function getPyramid(timeZone: string): Promise<GoalNode[]> {
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
    // Only goals in focus reach the board. Dreams and shelved goals live on
    // the triage and parked screens until they earn a place.
    else if (node.tier === "macro" && node.status === "active" && node.stage === "focus") {
      roots.push(node);
    }
  }

  const titleById = new Map(rows.map((row) => [row.id, row.title]));

  const today = todayIn(timeZone);
  const signed = await signImages(roots.map((macro) => macro.image_path ?? ""));

  for (const macro of roots) {
    // Movement means something under the goal actually got finished. Falling
    // back to when it was written stops a brand-new goal reading as stalled.
    const finishes = [
      ...macro.children.flatMap((micro) => [micro, ...micro.children]),
    ]
      .map((child) => child.completed_at)
      .filter((value): value is string => Boolean(value))
      .map((value) => localDateOf(value, timeZone));

    // Recommitting counts as movement — it is a decision, deliberately made,
    // and restarting the clock is the point of making it.
    const marks = [...finishes, localDateOf(macro.created_at, timeZone)];
    if (macro.recommitted_at) marks.push(localDateOf(macro.recommitted_at, timeZone));

    const lastMovedOn = marks.sort().at(-1)!;
    const idleDays = daysBetween(lastMovedOn, today);

    macro.lastMovedOn = lastMovedOn;
    macro.stalledDays = idleDays > STALLED_AFTER_DAYS ? idleDays : null;
    macro.imageUrl = macro.image_path ? signed.get(macro.image_path) ?? null : null;
    macro.blockedByTitle = macro.blocked_by ? titleById.get(macro.blocked_by) ?? null : null;
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

/** Macro goals that aren't on the board: waiting to be triaged, or shelved. */
export async function getMacroStages(): Promise<Omit<MacroStages, "focus">> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("goals")
    .select("*")
    .eq("tier", "macro")
    .eq("status", "active")
    .in("stage", ["dream", "shelved"])
    .order("created_at", { ascending: false });
  fail("Loading dreams and shelved goals", error);

  const rows = (data ?? []) as GoalRow[];
  return {
    dreams: rows.filter((row) => row.stage === "dream"),
    shelved: rows.filter((row) => row.stage === "shelved"),
  };
}

/** Every macro goal that could be named as a prerequisite for another. */
export async function getMacroTitles(): Promise<Pick<GoalRow, "id" | "title" | "stage">[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("goals")
    .select("id, title, stage")
    .eq("tier", "macro")
    .eq("status", "active")
    .order("title");
  fail("Loading goal titles", error);
  return (data ?? []) as Pick<GoalRow, "id" | "title" | "stage">[];
}

/** One macro goal with its micro goals and their minis, for the detail screen. */
export async function getMacroGoal(id: string, timeZone: string): Promise<GoalNode | null> {
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
  const signed = await signImages([macro.image_path ?? ""]);

  // Same rule as the board: movement means something under it got finished.
  const finishes = [...micros, ...((miniRows ?? []) as GoalRow[])]
    .map((child) => child.completed_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => localDateOf(value, timeZone));
  const marks = [...finishes, localDateOf(macro.created_at, timeZone)];
  if (macro.recommitted_at) marks.push(localDateOf(macro.recommitted_at, timeZone));
  const lastMovedOn = marks.sort().at(-1)!;
  const idleDays = daysBetween(lastMovedOn, todayIn(timeZone));

  const { data: blocker } = macro.blocked_by
    ? await db.from("goals").select("title").eq("id", macro.blocked_by).maybeSingle()
    : { data: null };

  return {
    ...macro,
    category,
    blockedByTitle: blocker?.title ?? null,
    imageUrl: macro.image_path ? signed.get(macro.image_path) ?? null : null,
    lastMovedOn,
    stalledDays: idleDays > STALLED_AFTER_DAYS ? idleDays : null,
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

export type Labelled = GoalRow & { categoryName: string | null; categorySlot: number | null };

export type Horizon = { key: string; label: string; goals: Labelled[] };

export type TodayBoard = {
  today: string;
  /** Step one: the floor. Ticked per day, never "finished". */
  atomic: (Labelled & { doneToday: boolean; streak: number })[];
  /** Step two: what you committed to today. */
  committed: Labelled[];
  /** Committed to an earlier day and still open — offered forward, not nagged. */
  carried: Labelled[];
  /** Candidates to pull onto today, grouped by why they are worth considering. */
  candidates: Horizon[];
  /** Step three: what actually moved today, habits included. */
  movedToday: { id: string; title: string; kind: "goal" | "habit" }[];
};

/**
 * The daily screen. Atomic non-negotiables sit on top; everything else is
 * bucketed by how soon it is due, so the list has a shape instead of being one
 * long backlog. Undated work folds away rather than competing for attention.
 */
export async function getToday(timeZone: string): Promise<TodayBoard> {
  const db = supabaseAdmin();
  const today = todayIn(timeZone);
  // 60 days is enough history to render any streak worth showing.
  const window = recentDays(today, 60);

  const [goalsResult, completionsResult, categories] = await Promise.all([
    db
      .from("goals")
      .select("*")
      .neq("tier", "universal")
      // Done goals come along so the close-out can report what moved today.
      .neq("status", "archived")
      .order("sort_order")
      .order("created_at"),
    db.from("goal_completions").select("*").gte("completed_on", window[0]),
    getCategories(),
  ]);
  fail("Loading today's goals", goalsResult.error);
  fail("Loading completions", completionsResult.error);

  const goals = (goalsResult.data ?? []) as GoalRow[];
  const completions = (completionsResult.data ?? []) as GoalCompletionRow[];

  const byCategoryId = new Map(categories.map((category) => [category.id, category]));
  const byId = new Map(goals.map((goal) => [goal.id, goal]));

  /** A goal's own category, or the nearest ancestor's. */
  function label(goal: GoalRow): Labelled {
    let cursor: GoalRow | undefined = goal;
    for (let depth = 0; cursor && depth < 8; depth++) {
      if (cursor.category_id) {
        const category = byCategoryId.get(cursor.category_id);
        return {
          ...goal,
          categoryName: category?.name ?? null,
          categorySlot: category?.color_slot ?? null,
        };
      }
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
    return { ...goal, categoryName: null, categorySlot: null };
  }

  const doneByGoal = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = doneByGoal.get(completion.goal_id) ?? new Set<string>();
    set.add(completion.completed_on);
    doneByGoal.set(completion.goal_id, set);
  }

  const atomic = goals
    .filter((goal) => goal.tier === "atomic" && goal.status === "active")
    .map((goal) => {
      const done = doneByGoal.get(goal.id) ?? new Set<string>();
      return { ...label(goal), doneToday: done.has(today), streak: streakEndingAt(done, today) };
    });

  // Only micro and mini goals are day-sized. A macro goal is the thing they
  // ladder up to, so it is never something you "do today".
  const workable = goals
    .filter(
      (goal) => goal.status === "active" && (goal.tier === "micro" || goal.tier === "mini"),
    )
    .map(label);

  const byDate = (a: Labelled, b: Labelled) =>
    (a.target_on ?? "9999").localeCompare(b.target_on ?? "9999") ||
    a.sort_order - b.sort_order ||
    a.created_at.localeCompare(b.created_at);

  const committed = workable.filter((goal) => goal.planned_on === today).sort(byDate);
  const carried = workable
    .filter((goal) => goal.planned_on !== null && goal.planned_on < today)
    .sort(byDate);

  const uncommitted = workable.filter((goal) => goal.planned_on === null).sort(byDate);
  const weekEnd = weekEndOf(today);
  const dated = uncommitted.filter((goal) => goal.target_on !== null);

  // One concrete next action per micro goal: its first open mini, or the
  // micro itself when it has none. Without this the picker would only ever
  // offer minis, and a board built mostly of micros would look unpullable.
  const minisByParent = new Map<string, Labelled[]>();
  for (const goal of uncommitted) {
    if (goal.tier !== "mini" || !goal.parent_id) continue;
    minisByParent.set(goal.parent_id, [...(minisByParent.get(goal.parent_id) ?? []), goal]);
  }

  const nextActions = uncommitted
    .filter((goal) => goal.tier === "micro")
    .map((micro) => minisByParent.get(micro.id)?.[0] ?? micro);

  const overdue = dated.filter((goal) => goal.target_on! < today);
  const dueThisWeek = dated.filter(
    (goal) => goal.target_on! >= today && goal.target_on! <= weekEnd,
  );

  // A goal already listed as overdue or due shouldn't appear twice.
  const alreadyOffered = new Set([...overdue, ...dueThisWeek].map((goal) => goal.id));

  const candidates: Horizon[] = [
    { key: "overdue", label: "Overdue", goals: overdue },
    { key: "week", label: "Due this week", goals: dueThisWeek },
    {
      key: "next",
      label: "Next up on the board",
      goals: nextActions.filter((goal) => !alreadyOffered.has(goal.id)).slice(0, 10),
    },
  ].filter((group) => group.goals.length > 0);

  const finishedToday = goals
    .filter((goal) => goal.completed_at && localDateOf(goal.completed_at, timeZone) === today)
    .map((goal) => ({ id: goal.id, title: goal.title, kind: "goal" as const }));
  const loggedToday = completions
    .filter((completion) => completion.completed_on === today)
    .map((completion) => ({
      id: completion.id,
      title: byId.get(completion.goal_id)?.title ?? "Habit",
      kind: "habit" as const,
    }));

  return {
    today,
    atomic,
    committed,
    carried,
    candidates,
    movedToday: [...finishedToday, ...loggedToday],
  };
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
  /** Palette slot of the category, so Evidence matches the board's colours. */
  categorySlot: number | null;
  kind: "finished" | "logged" | "added";
};

/**
 * Part 05 — the proof pile. Three sources: goals you finished, habit days you
 * logged, and wins you added by hand that were never on the board.
 */
export async function getEvidence(timeZone: string, limit = 200): Promise<EvidenceEntry[]> {
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

  const byCategoryId = new Map(categories.map((category) => [category.id, category]));
  type GraphRow = { id: string; parent_id: string | null; category_id: string | null };
  const graph = new Map(
    ((allGoalsResult.data ?? []) as GraphRow[]).map((row) => [row.id, row]),
  );

  function labelFor(categoryId: string | null): Pick<EvidenceEntry, "categoryName" | "categorySlot"> {
    const category = categoryId ? byCategoryId.get(categoryId) : undefined;
    return {
      categoryName: category?.name ?? null,
      categorySlot: category?.color_slot ?? null,
    };
  }

  /** A goal's own category, or the nearest ancestor's. */
  function categoryOfGoal(goalId: string) {
    let cursor = graph.get(goalId);
    // Bounded by the pyramid's depth; the guard is against a cyclic parent.
    for (let depth = 0; cursor && depth < 8; depth++) {
      if (cursor.category_id) return labelFor(cursor.category_id);
      cursor = cursor.parent_id ? graph.get(cursor.parent_id) : undefined;
    }
    return labelFor(null);
  }

  const finished: EvidenceEntry[] = ((finishedResult.data ?? []) as GoalRow[]).map((goal) => ({
    id: `goal:${goal.id}`,
    title: goal.title,
    tier: goal.tier,
    on: localDateOf(goal.completed_at ?? goal.updated_at, timeZone),
    note: goal.detail,
    ...categoryOfGoal(goal.id),
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
      ...categoryOfGoal(row.goal_id),
      kind: "logged",
    }));

  const added: EvidenceEntry[] = ((addedResult.data ?? []) as EvidenceEntryRow[]).map((entry) => ({
    id: `added:${entry.id}`,
    title: entry.title,
    tier: null,
    on: entry.happened_on,
    note: entry.note,
    ...labelFor(entry.category_id),
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

export type ProgramView = ProgramRow & {
  goalTitle: string | null;
  lastEngagedOn: string | null;
  /** Days since you last showed up. Null when you never have. */
  idleDays: number | null;
  engagements: number;
};

export type ProgramBoard = {
  programs: ProgramView[];
  totalInvested: number;
  /** Money tied up in things untouched for a month or more. */
  idleInvested: number;
  activeCount: number;
  idleCount: number;
  monthlyCommitments: number;
  endingSoon: ProgramView[];
};

export async function getPrograms(timeZone: string): Promise<ProgramBoard> {
  const db = supabaseAdmin();
  const today = todayIn(timeZone);

  const [programsResult, engagementsResult, goalsResult] = await Promise.all([
    db.from("programs").select("*").order("created_at", { ascending: false }),
    db.from("program_engagements").select("*").order("engaged_on", { ascending: false }),
    db.from("goals").select("id, title").eq("tier", "macro"),
  ]);
  fail("Loading programs", programsResult.error);
  fail("Loading program engagements", engagementsResult.error);
  fail("Loading goal titles", goalsResult.error);

  const engagements = (engagementsResult.data ?? []) as ProgramEngagementRow[];
  const goalTitles = new Map((goalsResult.data ?? []).map((row) => [row.id, row.title]));

  const byProgram = new Map<string, ProgramEngagementRow[]>();
  for (const entry of engagements) {
    byProgram.set(entry.program_id, [...(byProgram.get(entry.program_id) ?? []), entry]);
  }

  const programs: ProgramView[] = ((programsResult.data ?? []) as ProgramRow[]).map((program) => {
    const mine = byProgram.get(program.id) ?? [];
    // Already sorted newest first by the query.
    const lastEngagedOn = mine[0]?.engaged_on ?? null;
    return {
      ...program,
      goalTitle: program.goal_id ? goalTitles.get(program.goal_id) ?? null : null,
      lastEngagedOn,
      idleDays: lastEngagedOn ? daysBetween(lastEngagedOn, today) : null,
      engagements: mine.length,
    };
  });

  const live = programs.filter((program) => program.status === "active");
  // Never-engaged counts as idle: it is the worst case, not an exception.
  const isIdle = (program: ProgramView) =>
    program.status === "active" && (program.idleDays === null || program.idleDays >= IDLE_AFTER_DAYS);

  const soon = programs.filter(
    (program) =>
      program.ends_on !== null &&
      !program.evergreen &&
      program.status === "active" &&
      daysBetween(today, program.ends_on) <= 60,
  );

  return {
    programs,
    totalInvested: programs.reduce((sum, program) => sum + Number(program.cost ?? 0), 0),
    idleInvested: programs.filter(isIdle).reduce((sum, p) => sum + Number(p.cost ?? 0), 0),
    activeCount: live.length,
    idleCount: programs.filter(isIdle).length,
    monthlyCommitments: live.reduce(
      (sum, program) => sum + CADENCE_PER_MONTH[program.cadence],
      0,
    ),
    endingSoon: soon.sort((a, b) => (a.ends_on ?? "").localeCompare(b.ends_on ?? "")),
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
