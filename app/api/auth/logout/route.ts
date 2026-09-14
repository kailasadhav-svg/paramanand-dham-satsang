import { NextResponse } from "next/server";
import { MEMBER_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { scope?: string };
  const scope = body.scope === "admin" || body.scope === "member" ? body.scope : "all";
  const res = NextResponse.json({ ok: true });
  if (scope === "all" || scope === "admin") {
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  }
  if (scope === "all" || scope === "member") {
    res.cookies.set(MEMBER_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}
