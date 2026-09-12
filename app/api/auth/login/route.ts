import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  expectedSessionToken,
  sessionCookieOptions,
  verifyPin,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!body.pin || !verifyPin(body.pin)) {
    return NextResponse.json({ error: "पिन चुकीचा आहे" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expectedSessionToken(), sessionCookieOptions());
  return res;
}
