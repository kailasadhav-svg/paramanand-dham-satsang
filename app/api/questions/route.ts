import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { mirrorWeeklyQuestionToAjapa } from "@/lib/ajapa/mirror-weekly";
import { normalizePhone } from "@/lib/ajapa/phone";
import { ymdInIndia } from "@/lib/dates";
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
  const askedOn = body.asked_on && /^\d{4}-\d{2}-\d{2}$/.test(body.asked_on)
    ? body.asked_on
    : ymdInIndia();
  const question = await createQuestion({
    question: body.question,
    place_id: body.place_id ?? null,
    meeting_id: body.meeting_id ?? null,
    asked_on: askedOn,
  });

  // Also land in अजपा संवाद (परमानंद साहित्य) so सिंक shows it.
  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  let ajapa_id: number | null = null;
  if (actor) {
    try {
      const ajapa = await mirrorWeeklyQuestionToAjapa({
        question: question.question,
        place_id: question.place_id,
        asked_on: askedOn,
        seeker_phone: actor,
      });
      ajapa_id = ajapa?.id ?? null;
    } catch (err) {
      console.error("mirror weekly → ajapa failed", err);
    }
  }

  return NextResponse.json({ question, ajapa_id }, { status: 201 });
}
