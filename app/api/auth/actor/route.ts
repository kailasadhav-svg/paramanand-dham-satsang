import { NextResponse } from "next/server";
import {
  ACTOR_COOKIE,
  actorSessionToken,
  clearCookieOptions,
  getActorPhone,
  productionAuthBlockedReason,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  allowDebugOtp,
  createActorBindOtp,
  verifyActorBindOtp,
} from "@/lib/ajapa/otp";
import { normalizePhone } from "@/lib/ajapa/phone";
import { sendText, whatsappConfigured } from "@/lib/ajapa/whatsapp";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  detectStaffRole,
  isGuruPhone,
  isSoftwarePhone,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function needsOtp(phone: string): boolean {
  return isSoftwarePhone(phone) || isGuruPhone(phone);
}

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const phone = await getActorPhone();
  if (!phone) return NextResponse.json({ ok: true, phone: null, role: null });
  return NextResponse.json({
    ok: true,
    phone,
    role: detectStaffRole(phone),
  });
}

export async function POST(request: Request) {
  const blocked = productionAuthBlockedReason();
  if (blocked) return jsonError(blocked, 503);

  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    otp?: string;
  };
  const phone = normalizePhone(body.phone || "");
  if (phone.replace(/\D/g, "").length < 12) {
    return jsonError("१० अंकी मोबाइल टाका", 400);
  }

  const ip = clientIp(request);
  const limited = rateLimit(`actor-bind:${ip}:${phone}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return jsonError("खूप प्रयत्न — थोड्या वेळाने पुन्हा करा", 429);
  }

  const privileged = needsOtp(phone);

  if (privileged && !body.otp) {
    const otpLimit = rateLimit(`actor-otp:${phone}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!otpLimit.ok) {
      return jsonError("OTP मर्यादा — १ तासानंतर पुन्हा प्रयत्न करा", 429);
    }
    const { code, expires_at } = await createActorBindOtp({ phone });
    let waOk = false;
    let waError: string | null = null;
    if (whatsappConfigured()) {
      const wa = await sendText(
        phone,
        `परमानंद धाम · अ‍ॅप लॉगिन\n\nमोबाइल खात्री OTP: *${code}*\n\nअ‍ॅपमध्ये टाका (१० मिनिटे वैध).`,
      );
      waOk = Boolean(wa.ok);
      waError = wa.ok ? null : ("error" in wa ? wa.error : "send failed");
    } else {
      waError = "WhatsApp not configured";
    }
    return NextResponse.json({
      ok: true,
      needs_otp: true,
      phone,
      role: detectStaffRole(phone),
      expires_at,
      whatsapp_ok: waOk,
      whatsapp_error: waError,
      debug_otp: allowDebugOtp() ? code : undefined,
      message: waOk
        ? "WhatsApp OTP पाठवला — कोड टाका"
        : allowDebugOtp()
          ? `टेस्ट OTP: ${code}`
          : "OTP पाठवता आला नाही — नंतर पुन्हा प्रयत्न करा",
    });
  }

  if (privileged) {
    const verified = await verifyActorBindOtp({ phone, code: body.otp || "" });
    if (!verified.ok) return jsonError(verified.error, 400);
  }

  const res = NextResponse.json({
    ok: true,
    needs_otp: false,
    phone,
    role: detectStaffRole(phone),
    message: "मोबाइल जोडला",
  });
  res.cookies.set(ACTOR_COOKIE, actorSessionToken(phone), sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTOR_COOKIE, "", { ...clearCookieOptions() });
  return res;
}
