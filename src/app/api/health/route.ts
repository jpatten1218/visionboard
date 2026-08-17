import { NextResponse, type NextRequest } from "next/server";

import { todayIn } from "@/lib/dates";
import {
  getAvoidanceBoard,
  getCategories,
  getEvidence,
  getPyramid,
  getToday,
  getUniversalGoals,
  getWeek,
} from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Exercises every read path and reports counts only — never row contents.
 * Guarded by the same passcode as the board, so it is no more exposed than
 * the app itself. Useful for confirming a deploy can actually reach Supabase,
 * which the UI can only tell you once you are already logged in.
 */
export async function GET(request: NextRequest) {
  const passcode = process.env.VISION_BOARD_PASSCODE;
  const presented = request.nextUrl.searchParams.get("passcode");

  // 404 rather than 401: an unauthenticated caller learns nothing, not even
  // that this route exists.
  if (!passcode || presented !== passcode) {
    return new NextResponse("Not found", { status: 404 });
  }

  const startedAt = Date.now();
  const timeZone = "America/Chicago";

  try {
    const [pyramid, universal, today, evidence, avoidance, week, categories] = await Promise.all([
      getPyramid(),
      getUniversalGoals(),
      getToday(timeZone),
      getEvidence(),
      getAvoidanceBoard(),
      getWeek(timeZone),
      getCategories(),
    ]);

    // A trivial write-then-delete, so the report covers more than reads.
    const db = supabaseAdmin();
    const { data: probe, error: writeError } = await db
      .from("goals")
      .insert({ tier: "mini", title: "health check probe" })
      .select("id")
      .single();
    if (writeError) throw new Error(`write failed: ${writeError.message}`);
    const { error: deleteError } = await db.from("goals").delete().eq("id", probe!.id);
    if (deleteError) throw new Error(`cleanup failed: ${deleteError.message}`);

    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      today: todayIn(timeZone),
      reads: {
        macroGoals: pyramid.length,
        microGoals: pyramid.reduce((n, macro) => n + macro.children.length, 0),
        miniGoals: pyramid.reduce(
          (n, macro) => n + macro.children.reduce((m, micro) => m + micro.children.length, 0),
          0,
        ),
        universalGoals: universal.length,
        categories: categories.map((category) => category.name),
        atomicHabits: today.atomic.length,
        horizons: Object.fromEntries(
          today.horizons.map((horizon) => [horizon.key, horizon.goals.length]),
        ),
        unscheduled: today.later.length + today.undated.length,
        evidenceEntries: evidence.length,
        parkedIdeas: avoidance.items.length,
        promotionCredits: avoidance.creditsAvailable,
        weekStart: week.weekStart,
        consistencyPct: week.consistencyPct,
      },
      write: "insert and delete succeeded",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, elapsedMs: Date.now() - startedAt, error: (error as Error).message },
      { status: 500 },
    );
  }
}
