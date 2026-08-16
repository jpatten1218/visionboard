import type { GoalTier, IdeaPriority } from "@/lib/database.types";

/**
 * The workbook's own language, kept in one place so the app says what Matt
 * Vincent's Functional Vision Board Workbook says rather than paraphrasing it
 * differently on every screen.
 */

export type TierMeta = {
  tier: GoalTier;
  label: string;
  horizon: string;
  blurb: string;
  /** Sticky colour, matching the workbook's "3 colors minimum" instruction. */
  sticky: string;
  examples: string[];
};

export const TIERS: Record<GoalTier, TierMeta> = {
  universal: {
    tier: "universal",
    label: "Universal",
    horizon: "Timeless compass",
    blurb:
      "These aren't checkboxes — they are directions. You don't finish them. You live them.",
    sticky: "sticky-universal",
    examples: [],
  },
  macro: {
    tier: "macro",
    label: "Macro",
    horizon: "6–18 month bold moves",
    blurb: "Big bold vision, written in marker. No fake deadlines.",
    sticky: "sticky-macro",
    examples: ["Ride from Chicago to St. Louis", "Launch a coaching business", "Lose 100 lbs"],
  },
  micro: {
    tier: "micro",
    label: "Micro",
    horizon: "Weekly / monthly checkpoints",
    blurb: "The milestones under each macro goal. Two or three is plenty.",
    sticky: "sticky-micro",
    examples: ["Ride 6 hours this week", "Finalize your sales page"],
  },
  mini: {
    tier: "mini",
    label: "Mini",
    horizon: "Daily tasks",
    blurb: "The daily and weekly actions that serve a micro goal.",
    sticky: "sticky-mini",
    examples: ["2-hour ride today", "Write 1 blog post"],
  },
  atomic: {
    tier: "atomic",
    label: "Atomic",
    horizon: "Minimum effective daily habits",
    blurb: "Your non-negotiables. Two minutes or less. These are what save the bad days.",
    sticky: "sticky-atomic",
    examples: ["Drink 1 gallon of water", "10-minute walk", "5-minute breathwork"],
  },
};

export const TIER_ORDER: GoalTier[] = ["universal", "macro", "micro", "mini", "atomic"];

/** Which tier a new child of the given tier belongs to. Atomic stands alone. */
export const CHILD_TIER: Partial<Record<GoalTier, GoalTier>> = {
  macro: "micro",
  micro: "mini",
};

export const PRIORITY_LABEL: Record<IdeaPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type Prompt = { key: string; question: string; hint?: string };

/** Part 01 — Define Your Direction. */
export const DIRECTION_PROMPTS: Prompt[] = [
  {
    key: "direction.feel",
    question:
      "What do you want your life to feel like — not just look like — when you wake up every day?",
  },
  {
    key: "direction.stressors",
    question: "What worries or stressors do you want gone five years from now?",
  },
  {
    key: "direction.do",
    question: "What do you want to do?",
    hint: "The achievements. The visible half.",
  },
  {
    key: "direction.be",
    question: "Who do you want to be?",
    hint: "How you feel about your health, future, financial stability, relationships, and yourself. This matters more than what you achieve.",
  },
];

/** Bonus self-inquiry prompts — sharpening self-awareness. */
export const INQUIRY_PROMPTS: Prompt[] = [
  { key: "inquiry.sabotage", question: "What patterns sabotage your consistency?" },
  { key: "inquiry.story", question: "What story do you tell yourself when you quit?" },
  { key: "inquiry.identity", question: "What actions align with your future identity?" },
  {
    key: "inquiry.discomfort",
    question: "How do you handle discomfort — numb it, avoid it, or solve it?",
  },
  { key: "inquiry.outsourcing", question: "What emotions are you outsourcing your progress to?" },
];

export const PULL_QUOTES = {
  direction: "Don't chase goals without knowing what kind of life you're trying to build.",
  avoidance: "You can't do everything. Write it down. Park it. Earn your curiosity.",
  floor: "Your ceiling doesn't matter if you can't hit your floor.",
  progress: "Your ADHD doesn't get to decide who you become. Your consistency does.",
  responsibility: "Your life is not your fault — but it is your responsibility.",
} as const;

/**
 * Part 04's rule, enforced in the app rather than left to willpower: an idea
 * cannot leave the Avoidance List until a macro goal has been finished and not
 * yet spent on an earlier promotion.
 */
export const AVOIDANCE_RULE =
  "You can't move something off the Avoidance List until you finish a macro goal.";
