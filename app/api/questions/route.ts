import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { createQuestion, listQuestions } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");
  const unanswered = searchParams.get("unanswered") === "1";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const questions = listQuestions({
    place_id: placeId ? Number(placeId) : undefined,
    unanswered,
    from,
    to,
  });
  return NextResponse.json({ questions });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    place_id?: number | null;
    meeting_id?: number | null;
  };
  if (!body.question || !body.question.trim()) {
    return jsonError("प्रश्न लिहा", 400);
  }
  const question = createQuestion({
    question: body.question,
    place_id: body.place_id ?? null,
    meeting_id: body.meeting_id ?? null,
  });
  return NextResponse.json({ question }, { status: 201 });
}
