import { NextResponse } from "next/server";
import {
  ACTOR_COOKIE,
  actorSessionToken,
  clearCookieOptions,
  getActorPhone,
  productionAuthBlockedReason,
  sessionCookieOptions,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/ajapa/phone";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  detectStaffRole,
  isGuruPhone,
  isSoftwarePhone,
} from "@/lib/roles";
import {
  checkNewStaffPin,
  digitsOnly,
  firstTimeCode,
  safeEqualDigits,
} from "@/lib/staff-pin";
import { getStaffPinHash, setStaffPin, verifyStaffPin } from "@/lib/staff-pin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function needsPin(phone: string): boolean {
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

/**
 * Staff (संगणक / मार्गदर्शक) bind:
 *   no PIN yet  → last 4 digits of the mobile, then choose a PIN
 *   PIN set     → that PIN
 * Everyone else binds directly.
 */
export async function POST(request: Request) {
  const blocked = productionAuthBlockedReason();
  if (blocked) return jsonError(blocked, 503);

  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    code?: string;
    new_pin?: string;
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

  const role = detectStaffRole(phone);

  if (needsPin(phone)) {
    const code = digitsOnly(body.code);
    const newPin = digitsOnly(body.new_pin);
    const stored = await getStaffPinHash(phone);
    const firstTime = !stored;

    if (!code) {
      return NextResponse.json({
        ok: true,
        needs_code: true,
        first_time: firstTime,
        phone,
        role,
        message: firstTime
          ? "पहिल्यांदा: मोबाइलचे शेवटचे ४ अंक टाका"
          : "तुमचा पिन टाका",
      });
    }

    const pinLimit = rateLimit(`actor-pin:${phone}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!pinLimit.ok) {
      return jsonError("खूप चुकीचे प्रयत्न — १५ मिनिटांनी पुन्हा करा", 429);
    }

    if (firstTime) {
      if (!safeEqualDigits(code, firstTimeCode(phone))) {
        return jsonError("शेवटचे ४ अंक चुकीचे", 400);
      }
      if (!newPin) {
        return NextResponse.json({
          ok: true,
          needs_code: true,
          first_time: true,
          needs_pin_setup: true,
          phone,
          role,
          message: "नवा पिन तयार करा (४ ते ६ अंक)",
        });
      }
      const check = checkNewStaffPin(newPin, phone);
      if (!check.ok) return jsonError(check.error, 400);
      await setStaffPin(phone, newPin);
    } else if (!(await verifyStaffPin(phone, code))) {
      return jsonError("पिन चुकीचा", 400);
    }
  }

  const res = NextResponse.json({
    ok: true,
    needs_code: false,
    phone,
    role,
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
