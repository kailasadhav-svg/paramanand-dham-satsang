import { pickKnowledgeForQuestion } from "./knowledge";
import { formatLiteratureForSeeker } from "./literature";

const MIN_WORDS = 200;

export type AjapaTopicContext = {
  place_name?: string | null;
  meeting_date?: string | null;
  topic_kind?: "atmaprabha" | "upadesh" | null;
  topic_title?: string | null;
  notes?: string | null;
};

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function topicLabel(topic?: AjapaTopicContext | null): string {
  if (!topic?.topic_title?.trim()) return "";
  const kind =
    topic.topic_kind === "upadesh"
      ? "उपदेश"
      : topic.topic_kind === "atmaprabha"
        ? "आत्मप्रभा"
        : "";
  const place = topic.place_name ? `${topic.place_name} · ` : "";
  return `${place}${kind ? `${kind} · ` : ""}«${topic.topic_title.trim()}»`;
}

/** Soft spiritual padding — never meta/tech instructions. */
function expandToMinWords(base: string, literature: string): string {
  let text = base.trim();
  if (countWords(text) >= MIN_WORDS) return text;

  const filler = `

वरील परमानंद साहित्य श्रद्धेने वाचा व चिंतन करा. घाईने निर्णय घेऊ नका. कुटुंबातील कर्तव्ये आणि साधना एकत्र जगता येतात. नामस्मरण, सत्संग आणि सेवा या तिन्हींचा समन्वय ठेवा. पूर्ण समजले नाही तर पुन्हा शांत मनाने वाचा. अधिक स्पष्टतेसाठी मधुसुदनदास विजयानंद यांच्याकडे जाऊ शकतो.

${literature.slice(0, 2500)}
`;

  while (countWords(text) < MIN_WORDS) {
    text = `${text}\n${filler}`.trim();
    if (countWords(text) > MIN_WORDS + 80) break;
  }
  return text;
}

function scrubTechFromAnswer(text: string): string {
  return formatLiteratureForSeeker(text)
    .replace(/\(?\s*सत्संग संदर्भ:[^)\n]+\)?/g, "")
    .replace(/आजचा सत्संग विषय:[^\n]+/g, "")
    .replace(/आपल्या प्रश्नाबाबत\s*\([^)]*\)\s*/g, "")
    .replace(/अजपा व सत्संग परंपरेनुसार खालील विवेचन आहे\.?/g, "")
    .replace(/परमानंद साहित्यानुसार खालील विवेचन आहे\.?/g, "")
    .replace(/जुने\/सामान्य अजपा टेम्प्लेट[^\n]*/g, "")
    .replace(/टेम्प्लेट कॉपी करू नका[^\n]*/g, "")
    .replace(/संदर्भ (मजकूर|साहित्य) \(संक्षेप\):[\s\S]*$/m, "")
    .replace(/`1`\s*दाबून[^\n]*/g, "मधुसुदनदास विजयानंद यांच्याकडे मार्गदर्शन मागा.")
    .replace(/`1`/g, "१")
    .replace(/\bAI\b/gi, "साहित्य")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function llmAnswer(
  question: string,
  knowledge: string,
  topic?: AjapaTopicContext | null,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY || process.env.AJAPA_AI_API_KEY;
  if (!key) return null;
  const base = (process.env.AJAPA_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AJAPA_AI_MODEL || "gpt-4o-mini";
  const topicLine = topicLabel(topic);

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `तू परमानंद धाम परंपरेतील मराठी साहित्य-सहाय्यक आहेस.
नियम:
1) फक्त मराठीत उत्तर दे. किमान ${MIN_WORDS} शब्द.
2) साधकाच्या नेमक्या प्रश्नाला उत्तर दे. प्रत्येक साधक वेगळे विचारू शकतो.
3) फक्त दिलेल्या «संदर्भ साहित्य» मधून उत्तर दे. जे साहित्यात नाही ते कल्पित करू नको.
4) आरती विचारली तर पूर्ण पाठ ओळींनी दे; अर्थ विचारला तर उपलब्ध अर्थही दे.
5) उत्तर साध्या साहित्यासारखे लिहा — 【】, ##, AI, टेम्प्लेट, बटण, \`1\`, कोड किंवा तंत्रशब्द वापरू नको.
6) सत्संग विषय फक्त पार्श्वभूमी; उत्तरात «सत्संग संदर्भ» अशी ओळ लिहू नको.
7) राजकीय/वैद्यकीय सल्ला देऊ नको.
8) शेवटी एक साधे वाक्य: अधिक स्पष्टतेसाठी मधुसुदनदास विजयानंद यांच्याकडे जाऊ शकतो.`,
        },
        {
          role: "user",
          content: `${topicLine ? `(आंतरिक पार्श्वभूमी — उत्तरात लिहू नको: ${topicLine})\n` : ""}संदर्भ साहित्य:\n${knowledge}\n\nसाधकाचा प्रश्न:\n${question}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Ajapa AI error", res.status, err.slice(0, 400));
    return null;
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Generate Marathi literature answer ≥200 words — question-first, seeker-facing. */
export async function generateAjapaAiAnswer(
  question: string,
  topic?: AjapaTopicContext | null,
): Promise<{
  answer: string;
  source: "llm" | "knowledge";
  wordCount: number;
}> {
  const knowledgeRaw = pickKnowledgeForQuestion(question, topic?.topic_title);
  const literature = formatLiteratureForSeeker(knowledgeRaw);
  const llm = await llmAnswer(question, literature, topic);
  if (llm) {
    const answer = scrubTechFromAnswer(expandToMinWords(llm, literature));
    return { answer, source: "llm", wordCount: countWords(answer) };
  }

  const asksAarti = /आरती|आरति|aarti|arti/i.test(question);
  const base = asksAarti
    ? `जय श्री राम.

परमानंद साहित्य — आरती

${literature}

अर्थ व अधिक उलगडा हवे असल्यास मधुसुदनदास विजयानंद यांच्याकडे श्रद्धेने मार्गदर्शन मागा.`
    : `जय श्री राम.

${literature}

वरील परमानंद साहित्य वाचा व चिंतन करा. आवश्यक वाटल्यास मधुसुदनदास विजयानंद यांच्याकडे मार्गदर्शन मागा.`;

  const answer = scrubTechFromAnswer(expandToMinWords(base, literature));
  return { answer, source: "knowledge", wordCount: countWords(answer) };
}
