import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  expectedSessionToken,
  productionAuthBlockedReason,
  sessionCookieOptions,
  verifyPin,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = productionAuthBlockedReason();
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 503 });
  }

  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "खूप प्रयत्न — थोड्या वेळाने पुन्हा करा" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!body.pin || !verifyPin(body.pin)) {
    return NextResponse.json({ error: "पिन चुकीचा आहे" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expectedSessionToken(), sessionCookieOptions());
  return res;
}
