import { NextResponse } from "next/server";
import { verifyEscalateOtp } from "@/lib/ajapa/otp";
import { guruPhones, normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import {
  escalateAjapaQuestion,
  getAjapaQuestion,
  getWaSession,
} from "@/lib/ajapa/store";
import { notifyGuruNewQuestion } from "@/lib/ajapa/whatsapp";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Verify WhatsApp OTP → escalate to मधुसुदनदास. */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("invalid id", 400);

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const body = (await request.json().catch(() => ({}))) as { otp?: string };
  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);
  if (q.status !== "ai_answered") {
    return jsonError("हा प्रश्न आधीच संवादकांकडे / पूर्ण आहे", 400);
  }

  const role = detectStaffRole(actor);
  const isOwner = phonesEqual(actor, q.seeker_phone);
  if (!isOwner && role !== "software" && role !== "guru") {
    return jsonError("फक्त प्रश्नकर्ता OTP वापरू शकतो", 403);
  }

  const verified = await verifyEscalateOtp({
    questionId: id,
    phone: q.seeker_phone,
    code: body.otp || "",
  });
  if (!verified.ok) return jsonError(verified.error, 400);

  const escalated = await escalateAjapaQuestion(id);
  if (!escalated) return jsonError("एस्केलेट अयशस्वी", 500);

  for (const guru of guruPhones()) {
    const guruSession = await getWaSession(guru);
    await notifyGuruNewQuestion({
      to: guru,
      lastInboundAt: guruSession?.last_inbound_at ?? null,
      seekerPhone: escalated.seeker_phone,
      question: escalated.question,
      aiAnswer: escalated.ai_answer || "",
    });
  }

  return NextResponse.json({
    ok: true,
    question: escalated,
    message: "संवादकांकडे पाठवले · मधुसुदनदास यांना WhatsApp सूचना",
  });
}
