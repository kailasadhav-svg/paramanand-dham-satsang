import { NextResponse } from "next/server";
import { generateAjapaAiAnswer } from "@/lib/ajapa/ai";
import { createAjapaQuestion, listAjapaQuestions } from "@/lib/ajapa/store";
import type { AjapaStatus } from "@/lib/ajapa/types";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { normalizePhone } from "@/lib/offline/phone";
import { detectStaffRole } from "@/lib/roles";

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

/** In-app अजपा प्रश्न — same pipeline as WhatsApp `अजपा Q`. */
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
  };
  const question = body.question?.trim() || "";
  if (question.length < 3) {
    return jsonError("प्रश्न थोडा मोठा लिहा", 400);
  }

  const role = detectStaffRole(actor);
  // संवादक/संचालक can post on behalf of testing; still stored under actor phone
  void role;

  const { answer } = await generateAjapaAiAnswer(question);
  const row = await createAjapaQuestion({
    seeker_phone: actor,
    seeker_name: body.seeker_name?.trim() || null,
    question,
    ai_answer: answer,
  });

  return NextResponse.json({ question: row });
}
