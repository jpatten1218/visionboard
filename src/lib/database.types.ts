/**
 * Generated from the Supabase schema. Regenerate after any migration rather
 * than hand-editing.
 */

export type GoalTier = "universal" | "macro" | "micro" | "mini" | "atomic";
export type GoalStatus = "active" | "done" | "archived";
export type GoalDomain = "general" | "spiritual" | "relational";
export type IdeaPriority = "low" | "medium" | "high";
export type GoalStage = "dream" | "focus" | "shelved";
export type ProgramCadence =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "in_person"
  | "self_paced"
  | "none";
export type ProgramStatus = "active" | "completed" | "lapsed" | "not_started";

export type ProgramRow = {
  id: string;
  owner_id: string;
  name: string;
  provider: string | null;
  cost: number | null;
  cost_tier: number | null;
  cadence: ProgramCadence;
  commitment: string | null;
  goal_id: string | null;
  status: ProgramStatus;
  started_on: string | null;
  ends_on: string | null;
  /** Ongoing with no end date — deliberate, not a missing value. */
  evergreen: boolean;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramEngagementRow = {
  id: string;
  owner_id: string;
  program_id: string;
  engaged_on: string;
  note: string | null;
  created_at: string;
};
export type CheckRating = "low" | "mixed" | "high";

export type CategoryRow = {
  id: string;
  owner_id: string;
  name: string;
  sort_order: number;
  /** 1–8, indexing the fixed categorical palette in globals.css. */
  color_slot: number;
  created_at: string;
};

export type GoalRow = {
  id: string;
  owner_id: string;
  tier: GoalTier;
  parent_id: string | null;
  category_id: string | null;
  /** Optional target, never a deadline — see the workbook on fake timelines. */
  target_on: string | null;
  /** The day you committed to doing it, which is not the day it is due. */
  planned_on: string | null;
  title: string;
  detail: string | null;
  domain: GoalDomain;
  status: GoalStatus;
  /** Macro goals only: dreamt, in focus now, or waiting its turn. */
  stage: GoalStage;
  check_alignment: CheckRating | null;
  check_energy: CheckRating | null;
  check_impact: CheckRating | null;
  /** Another goal that has to happen first. */
  blocked_by: string | null;
  recommitted_at: string | null;
  dropped_reason: string | null;
  dropped_at: string | null;
  floor: string | null;
  ceiling: string | null;
  is_recurring: boolean;
  board_x: number | null;
  board_y: number | null;
  sort_order: number;
  image_path: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EvidenceEntryRow = {
  id: string;
  owner_id: string;
  title: string;
  note: string | null;
  category_id: string | null;
  happened_on: string;
  created_at: string;
};

export type GoalCompletionRow = {
  id: string;
  owner_id: string;
  goal_id: string;
  completed_on: string;
  hit_ceiling: boolean;
  note: string | null;
  created_at: string;
};

export type AvoidanceItemRow = {
  id: string;
  owner_id: string;
  idea: string;
  priority: IdeaPriority;
  revisit_on: string | null;
  replaces: string | null;
  promoted_at: string | null;
  promoted_goal_id: string | null;
  created_at: string;
};

export type WeeklyReviewRow = {
  id: string;
  owner_id: string;
  week_start: string;
  note: string | null;
  consistency_pct: number | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntryRow = {
  id: string;
  owner_id: string;
  prompt_key: string;
  response: string | null;
  created_at: string;
  updated_at: string;
};

export type ReadingListRow = {
  id: string;
  owner_id: string;
  title: string;
  why_it_matters: string | null;
  finished_at: string | null;
  sort_order: number;
  created_at: string;
};

type TableShape<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      goals: TableShape<GoalRow, "tier" | "title">;
      categories: TableShape<CategoryRow, "name">;
      evidence_entries: TableShape<EvidenceEntryRow, "title">;
      programs: TableShape<ProgramRow, "name">;
      program_engagements: TableShape<ProgramEngagementRow, "program_id" | "engaged_on">;
      goal_completions: TableShape<GoalCompletionRow, "goal_id">;
      avoidance_items: TableShape<AvoidanceItemRow, "idea">;
      weekly_reviews: TableShape<WeeklyReviewRow, "week_start">;
      journal_entries: TableShape<JournalEntryRow, "prompt_key">;
      reading_list: TableShape<ReadingListRow, "title">;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      goal_tier: GoalTier;
      goal_status: GoalStatus;
      goal_domain: GoalDomain;
      idea_priority: IdeaPriority;
    };
    CompositeTypes: Record<never, never>;
  };
};
