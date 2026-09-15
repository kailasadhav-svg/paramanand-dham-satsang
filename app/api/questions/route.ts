import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import { mirrorWeeklyQuestionToAjapa } from "@/lib/ajapa/mirror-weekly";
import { normalizePhone } from "@/lib/ajapa/phone";
import { ymdInIndia } from "@/lib/dates";
import { createQuestion, listQuestions } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");
  const unanswered = searchParams.get("unanswered") === "1";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const questions = await listQuestions({
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
    asked_on?: string;
  };
  if (!body.question || !body.question.trim()) {
    return jsonError("प्रश्न लिहा", 400);
  }
  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor) {
    return jsonError("मोबाइल प्रोफाइल आवश्यक — पुन्हा लॉगिन करा", 400);
  }

  const askedOn =
    body.asked_on && /^\d{4}-\d{2}-\d{2}$/.test(body.asked_on)
      ? body.asked_on
      : ymdInIndia();
  const question = await createQuestion({
    question: body.question,
    place_id: body.place_id ?? null,
    meeting_id: body.meeting_id ?? null,
    asked_on: askedOn,
    asked_by_phone: actor,
  });

  // संवाद: literature / AI उत्तर (knowledge fallback if no API key)
  let ajapa_id: number | null = null;
  let ajapa_error: string | null = null;
  try {
    const ajapa = await mirrorWeeklyQuestionToAjapa({
      question: question.question,
      place_id: question.place_id,
      asked_on: askedOn,
      seeker_phone: actor,
    });
    ajapa_id = ajapa?.id ?? null;
    if (!ajapa_id) ajapa_error = "संवाद तयार झाले नाही";
  } catch (err) {
    console.error("mirror weekly → ajapa failed", err);
    ajapa_error = err instanceof Error ? err.message : "संवाद त्रुटी";
  }

  return NextResponse.json(
    { question, ajapa_id, ajapa_error },
    { status: 201 },
  );
}
