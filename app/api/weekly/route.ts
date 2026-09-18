import { NextResponse } from "next/server";
import { getActorPhone, getSession } from "@/lib/auth";
import {
  jsonError,
  requireMemberApi,
  requireStaffActor,
  routeErrorResponse,
} from "@/lib/api-guard";
import { chintanViewForActor } from "@/lib/chintan";
import { defaultThursdayYmd } from "@/lib/dates";
import {
  getWeeklyQuestion,
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
    if (await getSession()) {
      const phone = await getActorPhone();
      if (phone) {
        const view = await chintanViewForActor({
          phone,
          weekStart,
        });
        const question = (await getWeeklyQuestion(weekStart)) ?? null;
        return NextResponse.json({
          week_start: weekStart,
          question,
          ...view,
        });
      }
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
