import { NextResponse } from "next/server";
import {
  MEMBER_COOKIE,
  memberSessionToken,
  productionAuthBlockedReason,
  sessionCookieOptions,
} from "@/lib/auth";
import { publicMember, verifyMemberLogin } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = productionAuthBlockedReason();
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 503 });
  }

  const ip = clientIp(request);
  const limited = rateLimit(`member-login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "खूप प्रयत्न — थोड्या वेळाने पुन्हा करा" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

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
