import { NextResponse } from "next/server";
import { mirrorRecentWeeklyQuestions } from "@/lib/ajapa/mirror-weekly";
import { normalizePhone } from "@/lib/ajapa/phone";
import { listAjapaQuestions } from "@/lib/ajapa/store";
import type { AjapaStatus } from "@/lib/ajapa/types";
import { jsonError, requireApiSession } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AjapaStatus | null;
  const seekerRaw = searchParams.get("seeker_phone") || undefined;
  const seeker = seekerRaw ? normalizePhone(seekerRaw) : undefined;
  const since = searchParams.get("since") || undefined;
  const limit = searchParams.get("limit");
  const claimOrphans = searchParams.get("claim_orphans") === "1";

  const valid: AjapaStatus[] = ["ai_answered", "escalated", "guru_answered"];
  if (status && !valid.includes(status)) {
    return await jsonError("Invalid status", 400);
  }

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  const mirrorFor = seeker || actor;

  let mirrored = 0;
  if (mirrorFor) {
    try {
      mirrored = await mirrorRecentWeeklyQuestions({
        days: 21,
        limit: 8,
        default_seeker_phone: mirrorFor,
        include_null_asker: claimOrphans,
      });
    } catch (err) {
      console.error("weekly→ajapa backfill failed", err);
    }
  }

  const questions = await listAjapaQuestions({
    status: status || undefined,
    seeker_phone: seeker,
    // After backfill, ignore stale since so newly mirrored rows always return.
    since: mirrored > 0 ? undefined : since,
    limit: limit ? Number(limit) : 100,
  });
  return NextResponse.json({
    questions,
    mirrored,
    server_time: new Date().toISOString(),
  });
}
