import { NextResponse } from "next/server";
import { createEscalateOtp } from "@/lib/ajapa/otp";
import { getAjapaQuestion } from "@/lib/ajapa/store";
import { sendText, whatsappConfigured } from "@/lib/ajapa/whatsapp";
import { normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Send WhatsApp OTP so seeker can request मधुसुदनदास answer. */
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

  const role = detectStaffRole(actor);
  const isOwner = phonesEqual(actor, q.seeker_phone);
  if (!isOwner && role !== "software" && role !== "guru") {
    return jsonError("फक्त प्रश्नकर्ता OTP मागू शकतो", 403);
  }

  const targetPhone = q.seeker_phone;
  const { code, expires_at } = await createEscalateOtp({
    questionId: id,
    phone: targetPhone,
  });

  const body = `परमानंद धाम · अजपा संवाद

मधुसुदनदास विजयानंद यांचे उत्तर मागण्यासाठी OTP:

*${code}*

अ‍ॅपमध्ये हा OTP टाका (१० मिनिटे वैध).
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
    sent_to: targetPhone.replace(/^91/, ""),
    expires_at,
    whatsapp_ok: wa.ok,
    whatsapp_error: wa.ok ? null : wa.error || null,
    // Only expose OTP when dry-run / unconfigured (local testing)
    debug_otp: dry ? code : undefined,
    message: wa.ok
      ? "WhatsApp वर OTP पाठवला — अ‍ॅपमध्ये टाका"
      : dry
        ? `WhatsApp बंद/dry-run · टेस्ट OTP: ${code}`
        : "WhatsApp OTP पाठवता आला नाही — नंतर पुन्हा प्रयत्न करा",
  });
}
