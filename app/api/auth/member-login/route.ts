import { NextResponse } from "next/server";
import { MEMBER_COOKIE, memberSessionToken, sessionCookieOptions } from "@/lib/auth";
import { publicMember, verifyMemberLogin } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mobile?: string;
    login_code?: string;
  };
  const member = await verifyMemberLogin(body.mobile ?? "", body.login_code ?? "");
  if (!member) {
    return NextResponse.json({ error: "मोबाइल किंवा संकेत चुकीचा आहे" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, member: publicMember(member) });
  res.cookies.set(MEMBER_COOKIE, memberSessionToken(member.id), sessionCookieOptions());
  return res;
}
