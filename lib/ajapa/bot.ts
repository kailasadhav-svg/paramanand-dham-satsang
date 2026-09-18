import { generateAjapaAiAnswer } from "./ai";
import {
  displayPhone,
  extractPhoneToken,
  guruPhones,
  isGuruPhone,
  normalizePhone,
} from "./phone";
import {
  createAjapaQuestion,
  escalateAjapaQuestion,
  getAjapaQuestion,
  getWaSession,
  latestEscalatedForSeeker,
  saveGuruTextAnswer,
  saveGuruVoiceAnswer,
  setWaSessionState,
  touchWaSession,
} from "./store";
import type { InboundWaMessage } from "./types";
import {
  askEscalate,
  askGuruReplyMode,
  fetchMediaUrl,
  notifyAiAnswer,
  notifyGuruAnswerReady,
  notifyGuruNewQuestion,
  sendAudioById,
  sendText,
} from "./whatsapp";

export type BotResult = {
  handled: boolean;
  replies: string[];
  questionId?: number;
};

/** Map button ids / labels to legacy 1/2 choices (numbers still work). */
function normalizeChoice(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (
    t === "1" ||
    lower === "ajapa_escalate" ||
    lower === "ajapa_type" ||
    /मधुसुदन|पाठवा|टाइप/i.test(t)
  ) {
    return "1";
  }
  if (t === "2" || lower === "ajapa_voice" || /व्हॉ?इस|voice/i.test(t)) {
    return "2";
  }
  if (lower === "ajapa_enough" || lower === "ajapa_cancel" || /पुरे|रद्द/i.test(t)) {
    return "cancel";
  }
  if (lower === "ajapa_open_app" || /अ‍ॅप|app/i.test(t)) {
    return "app";
  }
  return t;
}

function parseAjapaQ(text: string): string | null {
  const m = text.trim().match(/^(?:अजपा|ajapa)\s*q\s*[:\-]?\s*(.+)$/i);
  if (!m) return null;
  const q = m[1].trim();
  return q.length ? q : null;
}

function parseAjapaA(text: string): string | null {
  const m = text.trim().match(/^(?:अजपा|ajapa)\s*a\s*[:\-]?\s*(.+)$/i);
  if (!m) return null;
  return extractPhoneToken(m[1]);
}

async function handleAjapaQ(
  from: string,
  question: string,
  name?: string,
): Promise<BotResult> {
  const session = await touchWaSession(from);
  const { answer } = await generateAjapaAiAnswer(question);
  const row = await createAjapaQuestion({
    seeker_phone: from,
    seeker_name: name ?? null,
    question,
    ai_answer: answer,
  });

  await notifyAiAnswer({
    to: from,
    lastInboundAt: session.last_inbound_at,
    question: row,
  });
  await askEscalate({
    to: from,
    lastInboundAt: session.last_inbound_at,
    questionShort: question,
  });
  await setWaSessionState(from, "awaiting_escalate_choice", row.id);

  return {
    handled: true,
    replies: [answer, "मधुसुदनदास विजयानंद — बटण किंवा `1`."],
    questionId: row.id,
  };
}

async function handleEscalateChoice(from: string): Promise<BotResult> {
  const session = await getWaSession(from);
  if (!session?.ajapa_question_id) {
    await sendText(
      from,
      "सध्या एस्केलेट करण्यासाठी प्रश्न सापडला नाही. `अजपा Q` ने नवीन प्रश्न विचारा.",
    );
    return { handled: true, replies: ["no pending"] };
  }
  const q = await escalateAjapaQuestion(session.ajapa_question_id);
  if (!q || q.status !== "escalated") {
    await sendText(from, "हा प्रश्न आधीच पाठवला गेला असू शकतो.");
    return { handled: true, replies: ["already"] };
  }

  for (const guru of guruPhones()) {
    const guruSession = await getWaSession(guru);
    await notifyGuruNewQuestion({
      to: guru,
      lastInboundAt: guruSession?.last_inbound_at ?? null,
      seekerPhone: displayPhone(from),
      question: q.question,
      aiAnswer: q.ai_answer || "",
    });
  }

  await sendText(
    from,
    "तुमचा प्रश्न मधुसुदनदास विजयानंद यांच्याकडे पाठवला. उत्तर आल्यावर WhatsApp/अ‍ॅप वर कळेल.",
  );
  await setWaSessionState(from, "idle", q.id);
  return { handled: true, replies: ["escalated"], questionId: q.id };
}

async function handleAjapaA(guruPhone: string, seekerPhone: string): Promise<BotResult> {
  if (!isGuruPhone(guruPhone)) {
    await sendText(guruPhone, "`अजपा A` फक्त मधुसुदनदास विजयानंद यांच्या नंबरवरून चालते.");
    return { handled: true, replies: ["not guru"] };
  }
  await touchWaSession(guruPhone);
  const q = await latestEscalatedForSeeker(seekerPhone);
  if (!q) {
    await sendText(
      guruPhone,
      `चरणसेवक ${displayPhone(seekerPhone)} साठी प्रलंबित (escalated) प्रश्न नाही.`,
    );
    return { handled: true, replies: ["no escalated"] };
  }

  const preview = `प्रश्न #${q.id} · चरणसेवक ${displayPhone(seekerPhone)}\n\n${q.question}\n\n— परमानंद साहित्य —\n${(q.ai_answer || "").slice(0, 1500)}`;
  await sendText(guruPhone, preview.slice(0, 4000));
  const guruSession = await getWaSession(guruPhone);
  await askGuruReplyMode({
    to: guruPhone,
    lastInboundAt: guruSession?.last_inbound_at ?? null,
    seekerLabel: displayPhone(seekerPhone),
  });
  await setWaSessionState(guruPhone, "guru_awaiting_mode", q.id);
  return { handled: true, replies: ["showed question"], questionId: q.id };
}

async function handleGuruMode(guruPhone: string, text: string): Promise<BotResult> {
  const session = await getWaSession(guruPhone);
  const choice = normalizeChoice(text);
  if (choice === "1") {
    await setWaSessionState(guruPhone, "guru_awaiting_text", session?.ajapa_question_id ?? null);
    await sendText(guruPhone, "उत्तर टाइप करून पाठवा.");
    return { handled: true, replies: ["awaiting text"] };
  }
  if (choice === "2") {
    await setWaSessionState(guruPhone, "guru_awaiting_voice", session?.ajapa_question_id ?? null);
    await sendText(guruPhone, "व्हॉइस नोट पाठवा.");
    return { handled: true, replies: ["awaiting voice"] };
  }
  if (choice === "cancel") {
    await setWaSessionState(guruPhone, "idle", null);
    await sendText(guruPhone, "रद्द केले. पुन्हा `अजपा A` + मोबाइल वापरा.");
    return { handled: true, replies: ["cancelled"] };
  }
  await sendText(guruPhone, "बटण निवडा: टाइप / व्हॉइस — किंवा `1` / `2` दाबा.");
  return { handled: true, replies: ["remind mode"] };
}

async function finishGuruText(guruPhone: string, text: string): Promise<BotResult> {
  const session = await getWaSession(guruPhone);
  if (!session?.ajapa_question_id) {
    await setWaSessionState(guruPhone, "idle", null);
    return { handled: true, replies: ["missing q"] };
  }
  const saved = await saveGuruTextAnswer(session.ajapa_question_id, text);
  if (!saved) return { handled: true, replies: ["save fail"] };

  const seekerSession = await getWaSession(saved.seeker_phone);
  await notifyGuruAnswerReady({
    to: saved.seeker_phone,
    lastInboundAt: seekerSession?.last_inbound_at ?? null,
    questionShort: saved.question,
    answerText: saved.guru_answer_text,
  });
  await sendText(guruPhone, "उत्तर सेव्ह झाले. चरणसेवकाला सूचना गेली.");
  await setWaSessionState(guruPhone, "idle", null);
  return { handled: true, replies: ["guru text saved"], questionId: saved.id };
}

async function finishGuruVoice(guruPhone: string, mediaId: string): Promise<BotResult> {
  const session = await getWaSession(guruPhone);
  if (!session?.ajapa_question_id) {
    await setWaSessionState(guruPhone, "idle", null);
    return { handled: true, replies: ["missing q"] };
  }
  const url = await fetchMediaUrl(mediaId);
  const saved = await saveGuruVoiceAnswer(session.ajapa_question_id, { mediaId, url });
  if (!saved) return { handled: true, replies: ["save fail"] };

  const seekerSession = await getWaSession(saved.seeker_phone);
  await notifyGuruAnswerReady({
    to: saved.seeker_phone,
    lastInboundAt: seekerSession?.last_inbound_at ?? null,
    questionShort: saved.question,
    answerText: null,
  });
  await sendAudioById(saved.seeker_phone, mediaId);
  await sendText(guruPhone, "व्हॉइस उत्तर सेव्ह झाले व चरणसेवकाला पाठवले.");
  await setWaSessionState(guruPhone, "idle", null);
  return { handled: true, replies: ["guru voice saved"], questionId: saved.id };
}

/** Core WhatsApp Ajapa state machine. */
export async function processInboundMessage(msg: InboundWaMessage): Promise<BotResult> {
  const from = normalizePhone(msg.from);
  const text = (msg.text || "").trim();
  const sessionBefore = await getWaSession(from);
  await touchWaSession(from);

  const qCmd = text ? parseAjapaQ(text) : null;
  if (qCmd) return handleAjapaQ(from, qCmd, msg.profileName);

  const aPhone = text ? parseAjapaA(text) : null;
  if (aPhone) return handleAjapaA(from, aPhone);

  const session = sessionBefore
    ? { ...sessionBefore, last_inbound_at: new Date().toISOString() }
    : await getWaSession(from);

  if (session?.state === "awaiting_escalate_choice") {
    const choice = normalizeChoice(text);
    if (choice === "1") return handleEscalateChoice(from);
    if (choice === "cancel") {
      await setWaSessionState(from, "idle", session.ajapa_question_id);
      await sendText(from, "ठीक आहे. पुन्हा हवे असल्यास `अजपा Q` विचारा.");
      return { handled: true, replies: ["enough"] };
    }
    if (choice === "app") {
      const appUrl = process.env.APP_PUBLIC_URL || "https://satsang.dhyeyapurti.in/ajapa";
      await sendText(from, `अ‍ॅप: ${appUrl}`);
      return { handled: true, replies: ["app link"] };
    }
  }

  if (isGuruPhone(from) && session?.state === "guru_awaiting_mode" && text) {
    return handleGuruMode(from, text);
  }

  if (isGuruPhone(from) && session?.state === "guru_awaiting_text" && text) {
    return finishGuruText(from, text);
  }

  if (isGuruPhone(from) && session?.state === "guru_awaiting_voice") {
    if (msg.audioMediaId) return finishGuruVoice(from, msg.audioMediaId);
    if (text) {
      await sendText(from, "कृपया व्हॉइस नोट पाठवा (किंवा `अजपा A` पुन्हा सुरू करा).");
      return { handled: true, replies: ["want voice"] };
    }
  }

  if (/^(?:अजपा|ajapa)\b/i.test(text)) {
    await sendText(
      from,
      "वापर:\n• चरणसेवक: `अजपा Q` आणि प्रश्न\n• मार्गदर्शक: `अजपा A` आणि चरणसेवकाचा मोबाइल",
    );
    return { handled: true, replies: ["help"] };
  }

  return { handled: false, replies: [] };
}

export async function getQuestionForApi(id: number) {
  return getAjapaQuestion(id);
}
