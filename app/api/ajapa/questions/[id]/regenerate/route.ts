import { NextResponse } from "next/server";
import { generateAjapaAiAnswer } from "@/lib/ajapa/ai";
import {
  canViewAjapaQuestion,
  getAjapaQuestion,
  updateAjapaAiAnswer,
} from "@/lib/ajapa/store";
import { normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * चुकीचे परमानंद साहित्य उत्तर → प्रश्नानुसार पुन्हा तयार.
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

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  const role = actor ? detectStaffRole(actor) : "satsangi";
  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);
  if (!canViewAjapaQuestion(q, actor, role)) {
    return jsonError("परवानगी नाही", 403);
  }

  const isOwner = phonesEqual(actor, q.seeker_phone);
  const isStaff = role === "software" || role === "guru";
  if (!isOwner && !isStaff) {
    return jsonError("फक्त प्रश्नकर्ते किंवा कर्मचारी उत्तर पुन्हा तयार करू शकतात", 403);
  }
  if (q.status !== "ai_answered") {
    return jsonError("संवादक उत्तरानंतर साहित्य पुन्हा तयार होत नाही", 400);
  }

  const topic = {
    place_name: q.place_name,
    meeting_date: q.meeting_date,
    topic_kind: q.topic_kind,
    topic_title: q.topic_title,
    notes: null as string | null,
  };

  const { answer, source, wordCount } = await generateAjapaAiAnswer(
    q.question,
    topic,
  );
  const updated = await updateAjapaAiAnswer(id, answer);
  if (!updated) return jsonError("अद्यतन अयशस्वी", 500);

  return NextResponse.json({
    question: updated,
    source,
    wordCount,
  });
}
