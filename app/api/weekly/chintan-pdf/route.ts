import { NextResponse } from "next/server";
import { jsonError, requireGuideActor, routeErrorResponse } from "@/lib/api-guard";
import { villageChintanPdfStub } from "@/lib/chintan-pdf";
import { defaultThursdayYmd } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** मार्गदर्शक-only village चिंतन bundle. PDF renderer is stubbed (TODO). */
export async function GET(request: Request) {
  const auth = await requireGuideActor();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week_start") || defaultThursdayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonError("अवैध तारीख", 400);
  }
  try {
    const stub = await villageChintanPdfStub(weekStart);
    return NextResponse.json(stub);
  } catch (err) {
    return routeErrorResponse(err, "चिंतन PDF तयार अयशस्वी");
  }
}
