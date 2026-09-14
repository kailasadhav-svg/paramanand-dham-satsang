import { pickKnowledgeForQuestion } from "./knowledge";

const MIN_WORDS = 200;

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function expandToMinWords(base: string, question: string, knowledge: string): string {
  let text = base.trim();
  if (countWords(text) >= MIN_WORDS) return text;

  const filler = `

या उत्तराचा सारांश असा की आपला प्रश्न — «${question.trim()}» — साधनेच्या मार्गावरचा एक नैसर्गिक टप्पा आहे. वर दिलेल्या पुस्तके/परंपरा-आधारित विवेचनाप्रमाणे अजपा जप, सत्संग आणि गुरुकृपा या तिन्हींचा समन्वय ठेवा. दररोज थोडा वेळ श्वासासोबत नामस्मरण करा, गुरुवारी सत्संगाला उपस्थित रहा, आणि सेवा स्वीकारा. उत्तर पूर्णपणे समजले नाही तर पुन्हा शांत मनाने वाचा; घाईने निर्णय घेऊ नका. कुटुंबातील कर्तव्ये आणि साधना विरोधी नाहीत — दोन्ही एकत्र जगता येतात. भीती किंवा संशय आला तरी नामस्मरण सोडू नका. इतर साधकांशी तुलना करू नका; आपली गती आपलीच आहे. जर मधुसुदनदास विजयानंद यांच्याकडून अधिक स्पष्टता हवी असेल तर WhatsApp वर दिलेल्या सूचनाप्रमाणे \`1\` दाबा. गुरुउत्तर आल्यावर ते आचरणात आणण्याचा प्रयत्न करा. ही दिशा पुस्तके आणि परंपरेवर आधारित प्रारंभिक मार्गदर्शन आहे; अंतिम निर्णय श्रद्धा आणि गुरुकृपेवर अवलंबून.

संदर्भ मजकूर (संक्षेप):
${knowledge.slice(0, 1200)}
`;

  while (countWords(text) < MIN_WORDS) {
    text = `${text}\n${filler}`.trim();
    if (countWords(text) > MIN_WORDS + 80) break;
  }
  return text;
}

async function llmAnswer(question: string, knowledge: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY || process.env.AJAPA_AI_API_KEY;
  if (!key) return null;
  const base = (process.env.AJAPA_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AJAPA_AI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `तू परमानंद धाम / अजपा परंपरेतील मराठी सहाय्यक आहेस. फक्त मराठीत उत्तर दे. उत्तर किमान ${MIN_WORDS} शब्दांचे असावे. पुस्तके/माहितीवर आधारित विवेचन दे; राजकीय किंवा वैद्यकीय सल्ला देऊ नको. शेवटी एक वाक्य: अधिक स्पष्टतेसाठी मधुसुदनदास विजयानंद यांच्याकडे जाऊ शकतो.`,
        },
        {
          role: "user",
          content: `संदर्भ:\n${knowledge}\n\nप्रश्न:\n${question}`,
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

/** Generate Marathi answer ≥200 words from knowledge (+ optional LLM). */
export async function generateAjapaAiAnswer(question: string): Promise<{
  answer: string;
  source: "llm" | "knowledge";
  wordCount: number;
}> {
  const knowledge = pickKnowledgeForQuestion(question);
  const llm = await llmAnswer(question, knowledge);
  if (llm) {
    const answer = expandToMinWords(llm, question, knowledge);
    return { answer, source: "llm", wordCount: countWords(answer) };
  }

  const base = `जय श्री राम.

आपल्या प्रश्नाबाबत («${question.trim()}») अजपा व सत्संग परंपरेनुसार खालील विवेचन आहे.

${knowledge}

सारांश: श्वासासोबत नामस्मरण सुरू ठेवा, सत्संग व सेवा स्वीकारा, आणि आवश्यक वाटल्यास मधुसुदनदास विजयानंद यांच्याकडे \`1\` दाबून मार्गदर्शन मागा.`;

  const answer = expandToMinWords(base, question, knowledge);
  return { answer, source: "knowledge", wordCount: countWords(answer) };
}
