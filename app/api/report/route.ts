import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { defaultThursdayYmd } from "@/lib/dates";
import { buildWeeklyReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const thursday = searchParams.get("thursday") || defaultThursdayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(thursday)) {
    return jsonError("अवैध तारीख", 400);
  }
  return NextResponse.json(buildWeeklyReport(thursday));
}
