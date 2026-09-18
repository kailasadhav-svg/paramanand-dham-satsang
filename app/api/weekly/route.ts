import { NextResponse } from "next/server";
import { jsonError, requireMemberApi, requireStaffActor, routeErrorResponse } from "@/lib/api-guard";
import { defaultThursdayYmd } from "@/lib/dates";
import {
  getWeeklyQuestion,
  listWeeklyAnswers,
  memberWeeklyView,
  upsertWeeklyQuestion,
  WeeklyError,
} from "@/lib/weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week_start") || defaultThursdayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonError("अवैध तारीख", 400);
  }

  try {
    const staff = await requireStaffActor();
    if (staff.ok) {
      const question = (await getWeeklyQuestion(weekStart)) ?? null;
      const answers = question ? await listWeeklyAnswers(question.id) : [];
      return NextResponse.json({ week_start: weekStart, question, answers });
    }

    const memberAuth = await requireMemberApi();
    if (!memberAuth.ok) return memberAuth.response;
    const weekly = await memberWeeklyView(memberAuth.member, weekStart);
    return NextResponse.json({
      week_start: weekly.week_start,
      question: weekly.question,
      answer: weekly.answer,
    });
  } catch (err) {
    return routeErrorResponse(err, "साप्ताहिक विषय लोड अयशस्वी");
  }
}

export async function POST(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as {
    week_start?: string;
    question?: string;
    source?: string | null;
  };
  try {
    const question = await upsertWeeklyQuestion({
      week_start: body.week_start || defaultThursdayYmd(),
      question: body.question ?? "",
      source: body.source,
    });
    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof WeeklyError) return jsonError(err.message, err.status);
    return routeErrorResponse(err, "विषय जतन अयशस्वी");
  }
}
