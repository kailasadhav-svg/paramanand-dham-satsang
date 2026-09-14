/**
 * Smoke test for Ajapa state machine (WhatsApp dry-run).
 * Run: WHATSAPP_DRY_RUN=1 npx tsx scripts/ajapa-smoke.ts
 */
import { countWords, generateAjapaAiAnswer } from "../lib/ajapa/ai";
import { processInboundMessage } from "../lib/ajapa/bot";
import { listAjapaQuestions } from "../lib/ajapa/store";
import { normalizePhone } from "../lib/ajapa/phone";

process.env.WHATSAPP_DRY_RUN = "1";
process.env.GURU_PHONE = "9850120960";

async function main() {
  const seeker = normalizePhone("9876543210");
  const guru = normalizePhone("9850120960");

  const ai = await generateAjapaAiAnswer("अजपा जप कसा करावा?");
  if (ai.wordCount < 200) {
    throw new Error(`AI answer too short: ${ai.wordCount} words`);
  }
  console.log("AI words:", ai.wordCount, "source:", ai.source);

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
    text: `अजपा A ${seeker}`,
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
