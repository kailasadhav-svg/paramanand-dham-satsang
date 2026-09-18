import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Direct escalate disabled — Meta WhatsApp OTP आवश्यक.
 * Use POST .../request-otp then POST .../verify-otp.
 */
export async function POST(_request: Request, _ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  return jsonError(
    "मार्गदर्शकांकडे पाठवण्यासाठी Meta WhatsApp OTP आवश्यक — «OTP मागा» दाबा",
    400,
  );
}
