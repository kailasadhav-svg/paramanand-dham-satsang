import { NextResponse } from "next/server";
import { generateAjapaAiAnswer } from "@/lib/ajapa/ai";
import { createAjapaQuestion, listAjapaQuestions } from "@/lib/ajapa/store";
import type { AjapaStatus } from "@/lib/ajapa/types";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { getMeeting, getPlace } from "@/lib/db";
import { normalizePhone } from "@/lib/offline/phone";
import { detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AjapaStatus | null;
  const seeker = searchParams.get("seeker_phone") || undefined;
  const since = searchParams.get("since") || undefined;
  const placeIdRaw = searchParams.get("place_id");
  const meetingDate = searchParams.get("meeting_date") || undefined;
  const limit = searchParams.get("limit");

  const valid: AjapaStatus[] = ["ai_answered", "escalated", "guru_answered"];
  if (status && !valid.includes(status)) {
    return await jsonError("Invalid status", 400);
  }

  const place_id = placeIdRaw ? Number(placeIdRaw) : undefined;
  if (placeIdRaw && !Number.isFinite(place_id)) {
    return jsonError("अवैध place_id", 400);
  }

  const questions = await listAjapaQuestions({
    status: status || undefined,
    seeker_phone: seeker,
    place_id,
    meeting_date: meetingDate,
    since,
    limit: limit ? Number(limit) : 100,
  });
  return NextResponse.json({
    questions,
    server_time: new Date().toISOString(),
  });
}

/**
 * In-app अजपा — संवाद नेहमी जतन केलेल्या सत्संग विषयावर चालतो.
 * place_id + meeting_date आवश्यक; त्या स्थळाचा विषय नसेल तर प्रश्न नाकारला जातो.
 */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  if (!actor || actor.replace(/\D/g, "").length < 10) {
    return jsonError("मोबाइल आवश्यक — प्रोफाइल तपासा", 400);
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    seeker_name?: string | null;
    place_id?: number;
    meeting_date?: string;
  };
  const question = body.question?.trim() || "";
  if (question.length < 3) {
    return jsonError("प्रश्न थोडा मोठा लिहा", 400);
  }

  const placeId = Number(body.place_id);
  const meetingDate = String(body.meeting_date || "").trim();
  if (!Number.isFinite(placeId) || !meetingDate) {
    return jsonError("स्थळ व तारीख निवडा — संवाद विषयावर चालतो", 400);
  }

  const place = await getPlace(placeId);
  if (!place) return jsonError("स्थान सापडले नाही", 404);

  const meeting = await getMeeting(placeId, meetingDate);
  const topicTitle = meeting?.topic_title?.trim() || "";
  if (!topicTitle) {
    return jsonError(
      `${place.name} साठी या तारखेचा विषय अजून जतन नाही — प्रथम «विषय» मेनूमध्ये जतन करा`,
      400,
    );
  }

  const topic = {
    place_name: place.name,
    meeting_date: meetingDate,
    topic_kind: meeting?.topic_kind ?? null,
    topic_title: topicTitle,
    notes: meeting?.notes ?? null,
  };

  const role = detectStaffRole(actor);
  void role;

  const { answer } = await generateAjapaAiAnswer(question, topic);
  const row = await createAjapaQuestion({
    seeker_phone: actor,
    seeker_name: body.seeker_name?.trim() || null,
    question,
    ai_answer: answer,
    place_id: placeId,
    place_name: place.name,
    meeting_date: meetingDate,
    topic_kind: meeting?.topic_kind ?? null,
    topic_title: topicTitle,
  });

  return NextResponse.json({ question: row, topic });
}
