import { NextResponse } from "next/server";
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
  const limit = searchParams.get("limit");

  const valid: AjapaStatus[] = ["ai_answered", "escalated", "guru_answered"];
  if (status && !valid.includes(status)) {
    return jsonError("Invalid status", 400);
  }

  const questions = await listAjapaQuestions({
    status: status || undefined,
    seeker_phone: seeker,
    limit: limit ? Number(limit) : 100,
  });
  return NextResponse.json({ questions });
}
