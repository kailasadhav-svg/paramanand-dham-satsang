import { NextResponse } from "next/server";
import { getWaSession, getAjapaQuestion, saveGuruInAppAnswer } from "@/lib/ajapa/store";
import { normalizePhone } from "@/lib/ajapa/phone";
import { notifyGuruAnswerReady, sendText } from "@/lib/ajapa/whatsapp";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import { canSeeGuideScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const MAX_AUDIO_CHARS = 3_600_000; // ~2.7MB base64 — ~२ मिनिटे voice

/**
 * मार्गदर्शक in-app उत्तर: text आणि/किंवा voice (data URL).
 * फक्त guru.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("invalid id", 400);

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  if (!canSeeGuideScreens(detectStaffRole(actor))) {
    return jsonError("फक्त मार्गदर्शक उत्तर देऊ शकतात", 403);
  }

  const q = await getAjapaQuestion(id);
  if (!q) return jsonError("प्रश्न सापडला नाही", 404);
  if (q.status !== "escalated") {
    return jsonError("फक्त «मार्गदर्शकांकडे» असलेल्या प्रश्नांना उत्तर देता येते", 400);
  }

  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    audio_data_url?: string;
  };

  const text = body.text?.trim() || null;
  let audioUrl = body.audio_data_url?.trim() || null;

  if (audioUrl) {
    if (!audioUrl.startsWith("data:audio/")) {
      return jsonError("व्हॉइस फक्त audio data URL असावी", 400);
    }
    if (audioUrl.length > MAX_AUDIO_CHARS) {
      return jsonError("व्हॉइस खूप मोठी — जास्तीत जास्त २ मिनिटे रेकॉर्ड करा", 400);
    }
  }

  if (!text && !audioUrl) {
    return jsonError("मजकूर किंवा व्हॉइस नोट आवश्यक", 400);
  }

  const saved = await saveGuruInAppAnswer(id, {
    text,
    audioUrl,
    audioMediaId: audioUrl ? "in-app-recording" : null,
  });
  if (!saved) return jsonError("उत्तर जतन अयशस्वी", 500);

  const seekerSession = await getWaSession(saved.seeker_phone);
  await notifyGuruAnswerReady({
    to: saved.seeker_phone,
    lastInboundAt: seekerSession?.last_inbound_at ?? null,
    questionShort: saved.question,
    answerText: saved.guru_answer_text,
  });

  // If we have in-app audio only, still ping seeker to open app
  if (audioUrl && !text) {
    await sendText(
      saved.seeker_phone,
      `मधुसुदनदास विजयानंद यांचे व्हॉइस उत्तर तयार आहे. अ‍ॅप → अजपा → «पूर्ण» मध्ये ऐका.\nप्रश्न: ${saved.question.slice(0, 100)}`,
    ).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    question: saved,
    message: audioUrl
      ? text
        ? "मजकूर + व्हॉइस उत्तर जतन · साधकाला सूचना"
        : "व्हॉइस उत्तर जतन · साधकाला सूचना"
      : "मजकूर उत्तर जतन · साधकाला सूचना",
  });
}
