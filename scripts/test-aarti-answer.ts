import { pickKnowledgeForQuestion } from "../lib/ajapa/knowledge";
import { generateAjapaAiAnswer } from "../lib/ajapa/ai";
import { literatureCorpusStats } from "../lib/ajapa/literature";
import {
  literatureLooksMismatched,
  literatureLooksTechy,
} from "../lib/ajapa/mismatch";

async function main() {
  console.log("stats", literatureCorpusStats());
  const q = "आरती परमानंद पूर्ण दे व अर्थ सांग";
  const k = pickKnowledgeForQuestion(q);
  console.log("---PICK (first 400)---");
  console.log(k.slice(0, 400));

  const stale = `जय श्री राम.

आपल्या प्रश्नाबाबत («${q}») अजपा व सत्संग परंपरेनुसार खालील विवेचन आहे.

【अजपा जप】
अजपा म्हणजे श्वासासोबत चालणारा निरंतर नामस्मरण.`;
  console.log("stale mismatched", literatureLooksMismatched(q, stale));
  console.log("stale techy", literatureLooksTechy(stale));

  const a = await generateAjapaAiAnswer(q, {
    place_name: "नाशिक",
    topic_kind: "atmaprabha",
    topic_title: "मी कोण आहे",
  });
  console.log("---ANSWER source", a.source, "words", a.wordCount);
  console.log(a.answer.slice(0, 900));
  console.log("---checks---");
  console.log("bracket", a.answer.includes("【"));
  console.log("## md", /^##\s+/m.test(a.answer));
  console.log("ajapa template", /अजपा म्हणजे श्वास/.test(a.answer));
  console.log("aarti text", /आरती परमानंद/.test(a.answer));
  console.log("backtick 1", a.answer.includes("`1`"));
  console.log("AI word", /\bAI\b/.test(a.answer));
  console.log("satsang ref line", /सत्संग संदर्भ|आजचा सत्संग विषय/.test(a.answer));
  console.log("looks mismatched", literatureLooksMismatched(q, a.answer));
  console.log("looks techy", literatureLooksTechy(a.answer));

  if (
    a.answer.includes("【") ||
    /अजपा म्हणजे श्वास/.test(a.answer) ||
    a.answer.includes("`1`") ||
    !/आरती परमानंद/.test(a.answer) ||
    literatureLooksTechy(a.answer)
  ) {
    throw new Error("Aarti answer still looks tech / wrong");
  }
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
