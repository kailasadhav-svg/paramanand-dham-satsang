import { generateAjapaAiAnswer } from "./ai";
import {
  appPublicUrl,
  askQuestionPrompt,
  isGateKeywordOnly,
  parseAnswerCommand,
  parseQuestionCommand,
  startsWithGateKeyword,
  welcomeMessage,
} from "./keywords";
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
  sendButtons,
  sendText,
} from "./whatsapp";

export type BotResult = {
  handled: boolean;
  replies: string[];
  questionId?: number;
};

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
  if (lower === "ajapa_ask" || /प्रश्न|विचारा|ask/i.test(t)) {
    return "ask";
  }
  if (lower === "ajapa_help" || /मदत|help|मेनू|menu/i.test(t)) {
    return "help";
  }
  return t;
}

async function sendWelcome(to: string): Promise<void> {
  await sendButtons(to, welcomeMessage(), [
    { id: "ajapa_ask", title: "प्रश्न विचारा" },
    { id: "ajapa_open_app", title: "अ‍ॅप उघडा" },
    { id: "ajapa_help", title: "मदत" },
  ]);
}

async function handleQuestion(
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

async function handleEscalate(from: string): Promise<BotResult> {
  const session = await getWaSession(from);
  if (!session?.ajapa_question_id) {
    await sendText(
      from,
      "सध्या एस्केलेट करण्यासाठी प्रश्न सापडला नाही. `अजपा Q` / `SOHAM Q` ने नवीन प्रश्न विचारा.",
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

async function handleGuruLookup(guruPhone: string, seekerRaw: string): Promise<BotResult> {
  if (!isGuruPhone(guruPhone)) {
    await sendText(
      guruPhone,
      "`अजपा A` / `SOHAM A` फक्त मधुसुदनदास विजयानंद यांच्या नंबरवरून चालते.",
    );
    return { handled: true, replies: ["not guru"] };
  }
  const seekerPhone = extractPhoneToken(seekerRaw) || normalizePhone(seekerRaw);
  await touchWaSession(guruPhone);
  const q = await latestEscalatedForSeeker(seekerPhone);
  if (!q) {
    await sendText(
      guruPhone,
      `सेवक ${displayPhone(seekerPhone)} साठी प्रलंबित (escalated) प्रश्न नाही.`,
    );
    return { handled: true, replies: ["no escalated"] };
  }

  const preview = `🙏 प्रश्न #${q.id} · सेवक ${displayPhone(seekerPhone)}\n\n${q.question}\n\n— परमानंद साहित्य —\n${(q.ai_answer || "").slice(0, 1500)}`;
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
    await sendText(guruPhone, "रद्द केले. पुन्हा `अजपा A` / `SOHAM A` + मोबाइल वापरा.");
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
  const saved = await saveGuruVoiceAnswer(session.ajapa_question_id, {
    mediaId,
    url,
  });
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

/**
 * WhatsApp Ajapa / Soham bot.
 * Keywords: अजपा · ajapa · ajpa · SOHAM · सोऽहं …
 * जुना Team Dhyeyapurti मतदार बॉट अस्पर्श — फक्त keyword/सक्रिय अजपा session.
 * बाकी (hi, 1–9, …) → handled:false → webhook जुन्या बॉटकडे forward करतो.
 */
export async function processInboundMessage(msg: InboundWaMessage): Promise<BotResult> {
  const from = normalizePhone(msg.from);
  const text = (msg.text || "").trim();
  const sessionBefore = await getWaSession(from);

  const isOurButton = /^ajapa_/i.test(text);
  const isAjapaCommand = Boolean(
    (text && parseQuestionCommand(text)) ||
      (text && parseAnswerCommand(text)) ||
      (text && isGateKeywordOnly(text)) ||
      (text && startsWithGateKeyword(text)),
  );
  const inAjapaSession = Boolean(
    sessionBefore && sessionBefore.state && sessionBefore.state !== "idle",
  );

  // hi / मतदार मेनू 1–9 / इतर → जुना बॉट (आम्ही स्पर्श करत नाही)
  if (!isAjapaCommand && !isOurButton && !inAjapaSession) {
    return { handled: false, replies: [] };
  }

  await touchWaSession(from);

  const qCmd = text ? parseQuestionCommand(text) : null;
  if (qCmd) return handleQuestion(from, qCmd, msg.profileName);

  const aRaw = text ? parseAnswerCommand(text) : null;
  if (aRaw) return handleGuruLookup(from, aRaw);

  const session = sessionBefore
    ? { ...sessionBefore, last_inbound_at: new Date().toISOString() }
    : await getWaSession(from);

  if (session?.state === "awaiting_question" && text) {
    const choice = normalizeChoice(text);
    if (choice === "help" || isGateKeywordOnly(text) || text === "ajapa_help") {
      await sendWelcome(from);
      await setWaSessionState(from, "idle", null);
      return { handled: true, replies: ["welcome"] };
    }
    if (choice === "app" || text === "ajapa_open_app") {
      await sendText(from, `अ‍ॅप: ${appPublicUrl()}`);
      return { handled: true, replies: ["app link"] };
    }
    if (choice === "cancel") {
      await setWaSessionState(from, "idle", null);
      await sendText(from, "ठीक आहे. पुन्हा हवे असल्यास `अजपा` / `SOHAM` लिहा.");
      return { handled: true, replies: ["cancelled ask"] };
    }
    return handleQuestion(from, text, msg.profileName);
  }

  if (session?.state === "awaiting_escalate_choice") {
    const choice = normalizeChoice(text);
    if (choice === "1" || text === "ajapa_escalate") return handleEscalate(from);
    if (choice === "cancel" || text === "ajapa_enough") {
      await setWaSessionState(from, "idle", session.ajapa_question_id);
      await sendText(from, "ठीक आहे. पुन्हा हवे असल्यास `अजपा Q` / `SOHAM Q` विचारा.");
      return { handled: true, replies: ["enough"] };
    }
    if (choice === "app" || text === "ajapa_open_app") {
      await sendText(from, `अ‍ॅप: ${appPublicUrl()}`);
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

  if (text && isGateKeywordOnly(text)) {
    await sendWelcome(from);
    return { handled: true, replies: ["welcome"] };
  }

  // आमची बटणे (ajapa_*) — फक्त अजपा welcome नंतर
  if (isOurButton) {
    if (text === "ajapa_ask") {
      await setWaSessionState(from, "awaiting_question", null);
      await sendText(from, askQuestionPrompt());
      return { handled: true, replies: ["ask prompt"] };
    }
    if (text === "ajapa_open_app") {
      await sendText(from, `अ‍ॅप: ${appPublicUrl()}`);
      return { handled: true, replies: ["app link"] };
    }
    if (text === "ajapa_help") {
      await sendWelcome(from);
      return { handled: true, replies: ["help"] };
    }
  }

  if (text && startsWithGateKeyword(text)) {
    const rest = text
      .replace(/^(?:अजपा|अजापा|ajapa|ajpa|soham|सोहं|सोऽहं|सोहम्)\s*/i, "")
      .trim();
    const choice = normalizeChoice(rest || "help");
    if (choice === "ask") {
      await setWaSessionState(from, "awaiting_question", null);
      await sendText(from, askQuestionPrompt());
      return { handled: true, replies: ["ask prompt"] };
    }
    if (choice === "app") {
      await sendText(from, `अ‍ॅप: ${appPublicUrl()}`);
      return { handled: true, replies: ["app link"] };
    }
    await sendWelcome(from);
    return { handled: true, replies: ["help"] };
  }

  return { handled: false, replies: [] };
}

export async function getQuestionForApi(id: number) {
  return getAjapaQuestion(id);
}
