import { NextResponse } from "next/server";
import { verifyEscalateOtp } from "@/lib/ajapa/otp";
import { guruPhones, normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import {
  escalateAjapaQuestion,
  getAjapaQuestion,
  getWaSession,
  hasMadhusudanAskThisWeek,
} from "@/lib/ajapa/store";
import { notifyGuruNewQuestion } from "@/lib/ajapa/whatsapp";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { defaultThursdayYmd } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const ONE_PER_WEEK_MSG =
  "हमी: एका अधव्याड्यात एका सत्संगी चरणसेवकाकडून मधुसुदनदास यांना फक्त एकच प्रश्न. या आठवड्याचा प्रश्न आधीच संवादकांकडे गेला आहे.";

/** Verify Meta WhatsApp OTP on seeker mobile → escalate to मधुसुदनदास. */
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

  const isOwner = phonesEqual(actor, q.seeker_phone);
  if (!isOwner) {
    return jsonError(
      "Meta WhatsApp OTP फक्त प्रश्नकर्त्याच्या मोबाइलने खात्री होते",
      403,
    );
  }

  const weekDate = q.meeting_date || defaultThursdayYmd();
  if (
    await hasMadhusudanAskThisWeek({
      seeker_phone: q.seeker_phone,
      meeting_date: weekDate,
    })
  ) {
    return jsonError(ONE_PER_WEEK_MSG, 400);
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
    auth: "meta_whatsapp_otp",
    message:
      "OTP खात्री · मधुसुदनदास कडे पाठवले · या अधव्याड्यात आणखी एक प्रश्न नाही (हमी)",
  });
}
