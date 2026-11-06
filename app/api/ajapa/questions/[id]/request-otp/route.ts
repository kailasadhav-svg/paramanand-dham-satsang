import { NextResponse } from "next/server";
import { allowDebugOtp, createEscalateOtp } from "@/lib/ajapa/otp";
import { displayPhone, normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import { getAjapaQuestion, getWaSession, hasMadhusudanAskThisWeek } from "@/lib/ajapa/store";
import { sendOtpMessage, whatsappConfigured } from "@/lib/ajapa/whatsapp";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import { defaultThursdayYmd, weekFromThursday } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const ONE_PER_WEEK_MSG =
  "हमी: एका आठवड्यात (एक गुरुवार) एका परमानंद चरणसेवकाकडून मधुसुदनदास यांना फक्त एकच प्रश्न पाठवता येतो. या आठवड्याचा प्रश्न आधीच गेला आहे.";

/** Meta WhatsApp OTP — साधकाच्या मोबाइलवर; खात्री झाल्यावरच escalate. */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("अवैध प्रश्न", 400);

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);
  if (q.status !== "ai_answered") {
    return jsonError("हा प्रश्न आधीच मार्गदर्शकांकडे / पूर्ण आहे", 400);
  }

  if (!phonesEqual(actor, q.seeker_phone)) {
    return jsonError(
      "मधुसुदनदास उत्तरासाठी प्रश्नकर्त्याच्या मोबाइलवर Meta WhatsApp OTP लागतो — स्वतः लॉगिन करा",
      403,
    );
  }

  const week = weekFromThursday(defaultThursdayYmd());
  if (
    await hasMadhusudanAskThisWeek({
      seeker_phone: q.seeker_phone,
      weekStart: week.start,
      weekEnd: week.end,
    })
  ) {
    return jsonError(ONE_PER_WEEK_MSG, 400);
  }

  const { code, expires_at } = await createEscalateOtp({
    questionId: id,
    phone: q.seeker_phone,
  });

  let wa: { ok: boolean; error?: string; skipped?: boolean } = {
    ok: false,
    error: "not sent",
  };
  if (whatsappConfigured()) {
    const session = await getWaSession(normalizePhone(q.seeker_phone));
    wa = await sendOtpMessage({
      to: q.seeker_phone,
      code,
      lastInboundAt: session?.last_inbound_at ?? null,
      purpose: "escalate",
    });
  } else {
    wa = { ok: false, error: "WhatsApp not configured", skipped: true };
  }

  const dry = allowDebugOtp() || Boolean(wa.skipped);

  return NextResponse.json({
    ok: true,
    question_id: id,
    sent_to: displayPhone(q.seeker_phone),
    expires_at,
    whatsapp_ok: wa.ok,
    whatsapp_error: wa.ok ? null : wa.error || null,
    auth: "meta_whatsapp_otp",
    debug_otp: allowDebugOtp() ? code : undefined,
    message: wa.ok
      ? `Meta WhatsApp OTP · ${displayPhone(q.seeker_phone)} वर पाठवला — अ‍ॅपमध्ये टाका`
      : dry
        ? `WhatsApp dry-run · ${allowDebugOtp() ? `टेस्ट OTP: ${code}` : "OTP पाठवता आला नाही"}`
        : wa.error
          ? `OTP पाठवता आला नाही: ${wa.error.slice(0, 160)}`
          : "Meta WhatsApp OTP पाठवता आला नाही — नंतर पुन्हा प्रयत्न करा",
  });
}
