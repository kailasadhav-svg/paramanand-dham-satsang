import { NextResponse } from "next/server";
import {
  ACTOR_COOKIE,
  MEMBER_COOKIE,
  SESSION_COOKIE,
  clearCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { scope?: string };
  const scope = body.scope === "admin" || body.scope === "member" ? body.scope : "all";
  const res = NextResponse.json({ ok: true });
  const clear = clearCookieOptions();
  if (scope === "all" || scope === "admin") {
    res.cookies.set(SESSION_COOKIE, "", clear);
    res.cookies.set(ACTOR_COOKIE, "", clear);
  }
  if (scope === "all" || scope === "member") {
    res.cookies.set(MEMBER_COOKIE, "", clear);
  }
  return res;
}
