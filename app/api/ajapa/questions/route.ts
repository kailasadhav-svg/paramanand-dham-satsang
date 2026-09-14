import { NextResponse } from "next/server";
import { generateAjapaAiAnswer } from "@/lib/ajapa/ai";
import {
  literatureLooksMismatched,
  literatureLooksTechy,
} from "@/lib/ajapa/mismatch";
import {
  listAjapaQuestions,
  updateAjapaAiAnswer,
} from "@/lib/ajapa/store";
import type { AjapaQuestion, AjapaStatus } from "@/lib/ajapa/types";
import { jsonError, requireApiSession } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function healStaleAnswers(
  questions: AjapaQuestion[],
): Promise<AjapaQuestion[]> {
  const out: AjapaQuestion[] = [];
  let healed = 0;
  for (const q of questions) {
    if (
      healed >= 3 ||
      q.status !== "ai_answered" ||
      (!literatureLooksMismatched(q.question, q.ai_answer) &&
        !literatureLooksTechy(q.ai_answer))
    ) {
      out.push(q);
      continue;
    }
    try {
      const { answer } = await generateAjapaAiAnswer(q.question);
      const updated = await updateAjapaAiAnswer(q.id, answer);
      out.push(updated || { ...q, ai_answer: answer });
      healed += 1;
    } catch (err) {
      console.error("ajapa heal failed", q.id, err);
      out.push(q);
    }
  }
  return out;
}

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AjapaStatus | null;
  const seeker = searchParams.get("seeker_phone") || undefined;
  const since = searchParams.get("since") || undefined;
  const limit = searchParams.get("limit");
  const heal = searchParams.get("heal") !== "0";

  const valid: AjapaStatus[] = ["ai_answered", "escalated", "guru_answered"];
  if (status && !valid.includes(status)) {
    return await jsonError("Invalid status", 400);
  }

  let questions = await listAjapaQuestions({
    status: status || undefined,
    seeker_phone: seeker,
    since,
    limit: limit ? Number(limit) : 100,
  });

  if (heal) {
    questions = await healStaleAnswers(questions);
  }

  return NextResponse.json({
    questions,
    server_time: new Date().toISOString(),
  });
}
