/**
 * Generated from the Supabase schema. Regenerate after any migration rather
 * than hand-editing.
 */

export type GoalTier = "universal" | "macro" | "micro" | "mini" | "atomic";
export type GoalStatus = "active" | "done" | "archived";
export type GoalDomain = "general" | "spiritual" | "relational";
export type IdeaPriority = "low" | "medium" | "high";

export type CategoryRow = {
  id: string;
  owner_id: string;
  name: string;
  sort_order: number;
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
  title: string;
  detail: string | null;
  domain: GoalDomain;
  status: GoalStatus;
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
