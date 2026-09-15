import { NextResponse } from "next/server";
import { generateAjapaAiAnswer } from "@/lib/ajapa/ai";
import {
  getAjapaQuestion,
  updateAjapaAiAnswer,
} from "@/lib/ajapa/store";
import { normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import { detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * चुकीचे / तंत्र-रूपातील परमानंद साहित्य उत्तर → प्रश्नानुसार पुन्हा तयार.
 * मालक किंवा संचालक/संवादक; फक्त status = ai_answered.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("अवैध प्रश्न", 400);

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  const role = actor ? detectStaffRole(actor) : "charansevak";
  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);

  const isOwner = actor && phonesEqual(actor, q.seeker_phone);
  const isStaff = role === "software" || role === "guru";
  if (!isOwner && !isStaff) {
    return jsonError("फक्त प्रश्नकर्ते किंवा कर्मचारी उत्तर पुन्हा तयार करू शकतात", 403);
  }
  if (q.status !== "ai_answered") {
    return jsonError("संवादक उत्तरानंतर साहित्य पुन्हा तयार होत नाही", 400);
  }

  const { answer, source, wordCount } = await generateAjapaAiAnswer(q.question);
  const updated = await updateAjapaAiAnswer(id, answer);
  if (!updated) return jsonError("अद्यतन अयशस्वी", 500);

  return NextResponse.json({
    question: updated,
    source,
    wordCount,
  });
}
