/**
 * Smoke test — Ajapa/Soham WhatsApp bot (dry-run).
 * Run: WHATSAPP_DRY_RUN=1 npx tsx scripts/ajapa-smoke.ts
 */
import {
  AJAPA_AI_MAX_CHARS_TEXT,
  AJAPA_AI_MAX_WORDS,
  AJAPA_AI_MIN_WORDS,
  generateAjapaAiAnswer,
} from "../lib/ajapa/ai";
import { processInboundMessage } from "../lib/ajapa/bot";
import { isGateKeywordOnly, parseQuestionCommand } from "../lib/ajapa/keywords";
import { normalizePhone } from "../lib/ajapa/phone";
import { listAjapaQuestions } from "../lib/ajapa/store";

process.env.WHATSAPP_DRY_RUN = "1";
process.env.GURU_PHONE = "9850120960";

async function main() {
  if (!isGateKeywordOnly("SOHAM") || !isGateKeywordOnly("ajpa") || !isGateKeywordOnly("अजपा")) {
    throw new Error("keyword gate failed");
  }
  if (!parseQuestionCommand("SOHAM Q अजपा जप कसा करावा?")) {
    throw new Error("SOHAM Q parse failed");
  }
  console.log("keywords ok");

  const seeker = normalizePhone("9876543210");
  const guru = normalizePhone("9850120960");

  const welcome = await processInboundMessage({ from: seeker, text: "SOHAM" });
  if (!welcome.handled) throw new Error("SOHAM welcome failed");
  console.log("welcome ok");

  const ai = await generateAjapaAiAnswer("अजपा जप कसा करावा?");
  if (ai.wordCount < AJAPA_AI_MIN_WORDS) {
    throw new Error(`AI too short: ${ai.wordCount}`);
  }
  if (ai.wordCount > AJAPA_AI_MAX_WORDS) {
    throw new Error(`AI too long: ${ai.wordCount}`);
  }
  if (ai.answer.length > AJAPA_AI_MAX_CHARS_TEXT) {
    throw new Error(`AI chars ${ai.answer.length} > ${AJAPA_AI_MAX_CHARS_TEXT}`);
  }
  console.log("AI words:", ai.wordCount, "chars:", ai.answer.length, "source:", ai.source);

  const q1 = await processInboundMessage({
    from: seeker,
    text: "अजपा Q अजपा जप कसा करावा?",
    profileName: "Test Seeker",
  });
  if (!q1.handled || !q1.questionId) throw new Error("Q failed");
  console.log("Q ok", q1.questionId);

  const esc = await processInboundMessage({ from: seeker, text: "1" });
  if (!esc.handled) throw new Error("escalate failed");
  console.log("escalate ok");

  const a = await processInboundMessage({
    from: guru,
    text: `SOHAM A ${seeker}`,
  });
  if (!a.handled) throw new Error("A failed");
  console.log("A ok");

  const mode = await processInboundMessage({ from: guru, text: "1" });
  if (!mode.handled) throw new Error("mode failed");

  const ans = await processInboundMessage({
    from: guru,
    text: "नामस्मरण श्वासासोबत सुरू ठेवा. सत्संग व सेवा स्वीकारा.",
  });
  if (!ans.handled) throw new Error("guru text failed");
  console.log("guru text ok");

  const rows = await listAjapaQuestions({ limit: 5 });
  const row = rows.find((r) => r.id === q1.questionId);
  if (!row || row.status !== "guru_answered") {
    throw new Error(`expected guru_answered, got ${row?.status}`);
  }
  console.log("store ok", row.status);
  console.log("SMOKE PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
