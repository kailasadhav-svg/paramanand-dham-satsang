import { NextResponse } from "next/server";
import { requireMemberApi, routeErrorResponse } from "@/lib/api-guard";
import { publicMember } from "@/lib/members";
import { defaultThursdayYmd } from "@/lib/dates";
import { memberWeeklyView } from "@/lib/weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMemberApi();
  if (!auth.ok) return auth.response;
  try {
    const weekly = await memberWeeklyView(auth.member, defaultThursdayYmd());
    return NextResponse.json({
      member: publicMember(auth.member),
      weekly,
    });
  } catch (err) {
    return routeErrorResponse(err, "प्रोफाइल लोड अयशस्वी");
  }
}
