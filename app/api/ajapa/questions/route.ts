import { NextResponse } from "next/server";
import { mirrorRecentWeeklyQuestions } from "@/lib/ajapa/mirror-weekly";
import { normalizePhone } from "@/lib/ajapa/phone";
import { listAjapaQuestions } from "@/lib/ajapa/store";
import type { AjapaStatus } from "@/lib/ajapa/types";
import { jsonError, requireApiSession } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AjapaStatus | null;
  const seeker = searchParams.get("seeker_phone") || undefined;
  const since = searchParams.get("since") || undefined;
  const limit = searchParams.get("limit");

  const valid: AjapaStatus[] = ["ai_answered", "escalated", "guru_answered"];
  if (status && !valid.includes(status)) {
    return await jsonError("Invalid status", 400);
  }

  // Pull recent weekly प्रश्न into संवाद if they were never mirrored.
  try {
    const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
    await mirrorRecentWeeklyQuestions({
      days: 21,
      default_seeker_phone: actor || seeker || undefined,
    });
  } catch (err) {
    console.error("weekly→ajapa backfill failed", err);
  }

  const questions = await listAjapaQuestions({
    status: status || undefined,
    seeker_phone: seeker,
    since,
    limit: limit ? Number(limit) : 100,
  });
  return NextResponse.json({
    questions,
    server_time: new Date().toISOString(),
  });
}
