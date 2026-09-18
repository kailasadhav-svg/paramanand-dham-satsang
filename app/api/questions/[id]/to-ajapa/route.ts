import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import { mirrorWeeklyQuestionToAjapa } from "@/lib/ajapa/mirror-weekly";
import { phonesEqual } from "@/lib/ajapa/phone";
import { getDb, getQuestion } from "@/lib/db";
import { canSeeGuideScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Existing weekly प्रश्न → संवाद (पहिला / जुना प्रश्न ज्याचा asked_by नव्हता). */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("अवैध प्रश्न", 400);

  const q = await getQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);

  const staff = canSeeGuideScreens(detectStaffRole(actor));
  if (q.asked_by_phone && !phonesEqual(q.asked_by_phone, actor) && !staff) {
    return jsonError("हा प्रश्न दुसऱ्याचा आहे", 403);
  }

  // Stamp asker if missing (मधुकरसारखा पहिला प्रश्न).
  if (!q.asked_by_phone) {
    const db = await getDb();
    await db.execute({
      sql: `UPDATE questions SET asked_by_phone = ? WHERE id = ? AND (asked_by_phone IS NULL OR trim(asked_by_phone) = '')`,
      args: [actor, id],
    });
  }

  try {
    const ajapa = await mirrorWeeklyQuestionToAjapa({
      question: q.question,
      place_id: q.place_id,
      asked_on: q.asked_on,
      seeker_phone: actor,
    });
    return NextResponse.json({
      ajapa_id: ajapa?.id ?? null,
      question: q.question,
    });
  } catch (err) {
    console.error("mirror by id failed", err);
    return jsonError(
      err instanceof Error ? err.message : "संवाद तयार अयशस्वी",
      500,
    );
  }
}
