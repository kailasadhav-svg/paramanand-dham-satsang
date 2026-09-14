import { NextResponse } from "next/server";
import { jsonError, requireMemberApi } from "@/lib/api-guard";
import { submitWeeklyAnswer, WeeklyError } from "@/lib/weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireMemberApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as { answer?: string };
  try {
    const answer = await submitWeeklyAnswer({
      memberId: auth.member.id,
      answer: body.answer ?? "",
    });
    return NextResponse.json({ answer }, { status: 201 });
  } catch (err) {
    if (err instanceof WeeklyError) return jsonError(err.message, err.status);
    throw err;
  }
}
