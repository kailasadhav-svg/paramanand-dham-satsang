import { NextResponse } from "next/server";
import { getMemberId, getSession } from "@/lib/auth";
import { getMemberById, publicMember } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSession();
  const memberId = await getMemberId();
  const member = memberId ? await getMemberById(memberId) : undefined;
  if (!admin && !member) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    role: admin ? "admin" : "member",
    admin,
    member: member ? publicMember(member) : null,
  });
}
