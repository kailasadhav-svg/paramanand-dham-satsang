import { pickKnowledgeForQuestion } from "./knowledge";

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

function expandToMinWords(
  base: string,
  question: string,
  knowledge: string,
  topic?: AjapaTopicContext | null,
): string {
  let text = base.trim();
  if (countWords(text) >= MIN_WORDS) return text;

  const topicLine = topicLabel(topic);
  const filler = `

या उत्तराचा विस्तार: साधकाचा प्रश्न — «${question.trim()}» —${
    topicLine ? ` (आजचा सत्संग संदर्भ: ${topicLine})` : ""
  } याला वर दिलेल्या परमानंद साहित्यानुसारच उत्तर द्यावे. प्रत्येक साधकाचा प्रश्न वेगळा असतो; जुने/सामान्य अजपा टेम्प्लेट कॉपी करू नका. श्रद्धेने वाचा, चिंतन करा; पूर्ण समजले नाही तर पुन्हा शांत मनाने वाचा. कुटुंबातील कर्तव्ये आणि साधना एकत्र जगता येतात. अधिक स्पष्टतेसाठी मधुसुदनदास विजयानंद यांच्याकडे जाऊ शकतो. ही दिशा परमानंद साहित्य व परंपरेवर आधारित प्रारंभिक मार्गदर्शन आहे.

संदर्भ साहित्य (संक्षेप):
${knowledge.slice(0, 5000)}
`;

  while (countWords(text) < MIN_WORDS) {
    text = `${text}\n${filler}`.trim();
    if (countWords(text) > MIN_WORDS + 80) break;
  }
  return text;
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
2) **सर्वात महत्त्वाचे:** साधकाच्या नेमक्या प्रश्नाला उत्तर दे. प्रत्येक साधक वेगळे विचारू शकतो — जुने/सामान्य अजपा उत्तर कॉपी करू नको.
3) **फक्त दिलेल्या «संदर्भ साहित्य» मधून** उत्तर दे (आत्मप्रभा / आरती / उपदेश रत्ने). जे साहित्यात नाही ते कल्पित करू नको.
4) आरती विचारली तर पूर्ण पाठ ओळींनी दे; अर्थ विचारला तर अर्थही दे.
5) सत्संग विषय फक्त पार्श्वभूमी आहे — विषयामुळे चुकीचे साहित्य लावू नको.
6) संदर्भ अपुरा असल्यास स्पष्ट सांग व मधुसुदनदास विजयानंद यांच्याकडे जाण्याचा सल्ला दे.
7) राजकीय/वैद्यकीय सल्ला देऊ नको.
8) शेवटी एक वाक्य: अधिक स्पष्टतेसाठी मधुसुदनदास विजयानंद यांच्याकडे जाऊ शकतो.`,
        },
        {
          role: "user",
          content: `${topicLine ? `सत्संग संदर्भ (फक्त पार्श्वभूमी): ${topicLine}\n${topic?.notes ? `टिपणी: ${topic.notes}\n` : ""}\n` : ""}संदर्भ साहित्य:\n${knowledge}\n\nसाधकाचा प्रश्न (यालाच उत्तर द्या):\n${question}`,
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

function polishSeekerAnswer(text: string): string {
  return text
    .replace(/【([^】]*)】/g, "$1")
    .replace(/`1`/g, "«मधुसुदनदास विजयानंद यांच्याकडे पाठवा»")
    .replace(/\b1\s*दाबून/g, "बटण दाबून")
    .trim();
}

/** Generate Marathi literature answer ≥200 words — question-first, unique per seeker. */
export async function generateAjapaAiAnswer(
  question: string,
  topic?: AjapaTopicContext | null,
): Promise<{
  answer: string;
  source: "llm" | "knowledge";
  wordCount: number;
}> {
  const knowledge = pickKnowledgeForQuestion(question, topic?.topic_title);
  const llm = await llmAnswer(question, knowledge, topic);
  if (llm) {
    const answer = polishSeekerAnswer(
      expandToMinWords(llm, question, knowledge, topic),
    );
    return { answer, source: "llm", wordCount: countWords(answer) };
  }

  const topicLine = topicLabel(topic);
  const base = `जय श्री राम.

आपल्या प्रश्नाबाबत («${question.trim()}») परमानंद साहित्यानुसार खालील विवेचन आहे.${
    topicLine ? `\n(सत्संग संदर्भ: ${topicLine})` : ""
  }

${knowledge}

सारांश: वरील साहित्य वाचा व चिंतन करा. आवश्यक वाटल्यास मधुसुदनदास विजयानंद यांच्याकडे पाठवा.`;

  const answer = polishSeekerAnswer(
    expandToMinWords(base, question, knowledge, topic),
  );
  return { answer, source: "knowledge", wordCount: countWords(answer) };
}
