import { NextResponse } from "next/server";
import { createEscalateOtp } from "@/lib/ajapa/otp";
import { getAjapaQuestion, hasMadhusudanAskThisWeek } from "@/lib/ajapa/store";
import { sendText, whatsappConfigured } from "@/lib/ajapa/whatsapp";
import { displayPhone, normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { defaultThursdayYmd } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const ONE_PER_WEEK_MSG =
  "हमी: एका अधव्याड्यात (एक गुरुवार) एका सत्संगी चरणसेवकाकडून मधुसुदनदास यांना फक्त एकच प्रश्न पाठवता येतो. या आठवड्याचा प्रश्न आधीच गेला आहे.";

/**
 * Meta WhatsApp verified OTP — साधकाच्या मोबाइलवर.
 * OTP खात्री झाल्यावरच मधुसुदनदास कडे escalate.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("invalid id", 400);

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);
  if (q.status !== "ai_answered") {
    return jsonError("हा प्रश्न आधीच संवादकांकडे / पूर्ण आहे", 400);
  }

  const isOwner = phonesEqual(actor, q.seeker_phone);
  if (!isOwner) {
    return jsonError(
      "मधुसुदनदास उत्तरासाठी प्रश्नकर्त्याच्या मोबाइलवर Meta WhatsApp OTP लागतो — स्वतः लॉगिन करा",
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

  const targetPhone = q.seeker_phone;
  const { code, expires_at } = await createEscalateOtp({
    questionId: id,
    phone: targetPhone,
  });

  const body = `परमानंद धाम · अजपा संवाद

मधुसुदनदास विजयानंद यांचे उत्तर मागण्यासाठी *Meta WhatsApp OTP*:

*${code}*

अ‍ॅप → अजपा मध्ये हा OTP टाका (१० मिनिटे वैध).
हमी: या अधव्याड्यात फक्त एकच प्रश्न मधुसुदनदास यांना.
प्रश्न: ${q.question.slice(0, 120)}`;

  let wa: { ok: boolean; error?: string; skipped?: boolean } = {
    ok: false,
    error: "not sent",
  };
  if (whatsappConfigured()) {
    wa = await sendText(targetPhone, body);
  } else {
    wa = { ok: false, error: "WhatsApp not configured", skipped: true };
  }

  const dry =
    process.env.WHATSAPP_DRY_RUN === "1" ||
    process.env.WHATSAPP_DRY_RUN === "true" ||
    wa.skipped;

  return NextResponse.json({
    ok: true,
    question_id: id,
    sent_to: displayPhone(targetPhone),
    expires_at,
    whatsapp_ok: wa.ok,
    whatsapp_error: wa.ok ? null : wa.error || null,
    auth: "meta_whatsapp_otp",
    debug_otp: dry ? code : undefined,
    message: wa.ok
      ? `Meta WhatsApp OTP · ${displayPhone(targetPhone)} वर पाठवला — अ‍ॅपमध्ये टाका`
      : dry
        ? `WhatsApp dry-run · टेस्ट OTP: ${code}`
        : "Meta WhatsApp OTP पाठवता आला नाही — नंतर पुन्हा प्रयत्न करा",
  });
}
