/**
 * Paramanand literature knowledge for अजपा answers.
 * Corpus = data/literature/*.md (आत्मप्रभा + आरत्या + चौदा रत्ने).
 * No invented text — pick from saved literature only.
 */
import { loadLiteratureCorpus } from "./literature";

export type KnowledgeEntry = {
  title: string;
  keywords: string[];
  body: string;
};

/** Small app-flow seeds (not full books) — merged after corpus. */
const APP_SEEDS: KnowledgeEntry[] = [
  {
    title: "सत्संग आणि प्रश्न (अ‍ॅप)",
    keywords: ["सत्संग", "गुरुवार", "उपस्थिती", "विषय", "प्रश्न", "सेवा", "अजपा"],
    body: `गुरुवारी सत्संग म्हणजे एकत्र श्रवण, चिंतन आणि सेवा. उपस्थिती नोंदवणे, विषय समजून घेणे आणि प्रश्न लिहिणे ही साधना व्यवस्थित ठेवण्याची पद्धत आहे. प्रश्नाचे उत्तर परमानंद साहित्य (आत्मप्रभा / आरत्या / उपदेश रत्ने) किंवा गुरुंकडून येऊ शकते. साहित्य-आधारित उत्तर प्रारंभिक दिशा देते; अंतिम निर्णयासाठी गुरुकृपा महत्त्वाची.`,
  },
  {
    title: "गुरुकृपा (अ‍ॅप)",
    keywords: ["गुरु", "गुरुकृपा", "मधुसुदन", "मधुसूदन", "विजयानंद", "मार्गदर्शन"],
    body: `मधुसुदनदास विजयानंद यांच्याकडे प्रश्न पाठवणे म्हणजे श्रद्धेने मार्गदर्शन मागणे. गुरु उत्तर टाइप किंवा व्हॉइसने देऊ शकतात. उत्तर आल्यावर कृतज्ञतेने स्वीकारा. तुलना करू नका; आपल्या प्रश्नाचे उत्तर आपल्या पात्रतेनुसार येते.`,
  },
];

function allKnowledge(): KnowledgeEntry[] {
  return [...loadLiteratureCorpus(), ...APP_SEEDS];
}

/** @deprecated use allKnowledge via pick — kept for tests/debug */
export function getAjapaKnowledge(): KnowledgeEntry[] {
  return allKnowledge();
}

export const AJAPA_KNOWLEDGE: KnowledgeEntry[] = APP_SEEDS;

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\u093c\u0901\u0902]/g, "")
    .replace(/[ऽ']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(text: string): string[] {
  return normalizeForMatch(text)
    .split(/[\s|,.;:?!«»""''()【】\[\]\/\\-]+/)
    .filter((t) => t.length > 1);
}

function scoreEntry(
  k: KnowledgeEntry,
  qNorm: string,
  qTokens: string[],
  topicTokens: string[],
): number {
  const hay = normalizeForMatch(
    `${k.title} ${k.keywords.join(" ")} ${k.body}`,
  );
  let score = 0;
  for (const kw of k.keywords) {
    const n = normalizeForMatch(kw);
    if (n.length > 1 && qNorm.includes(n)) score += 4;
  }
  const titleNorm = normalizeForMatch(k.title);
  for (const token of qTokens) {
    if (token.length < 2) continue;
    if (titleNorm.includes(token)) score += 5;
    else if (hay.includes(token)) score += 2;
  }
  for (const token of topicTokens) {
    if (token.length < 3) continue;
    if (titleNorm.includes(token)) score += 1;
    else if (hay.includes(token)) score += 0.25;
  }
  return score;
}

/**
 * Pick literature by the seeker's question primarily.
 * Never return unrelated seeds when score is 0.
 */
export function pickKnowledgeForQuestion(
  question: string,
  topicTitle?: string | null,
): string {
  const qNorm = normalizeForMatch(question);
  const qTokens = tokensOf(question);
  const topicTokens = topicTitle ? tokensOf(topicTitle) : [];
  const corpus = allKnowledge();

  const scored = corpus
    .map((k) => ({ k, score: scoreEntry(k, qNorm, qTokens, topicTokens) }))
    .sort((a, b) => b.score - a.score);

  const asksAarti = /आरती|आरति|aarti|arti|भूपाळी|भुपाळी/i.test(question);
  const asksRatne = /रत्न|उपदेश|चौदा/i.test(question);
  const asksAtma = /आत्मप्रभा|मी कोण|सोहं|सोऽहं|अजपा/i.test(question);

  if (asksAarti) {
    const aarti = scored
      .filter(
        (s) =>
          /आरती|परमहंस|भूपाळी|भुपाळी|स्तुति|स्तुती/i.test(s.k.title) ||
          /॥\s*आरती|नारायण सरस्वती|तू एक परमहंस|॥\s*भुपाळी|॥\s*भूपाळी/i.test(
            s.k.body.slice(0, 400),
          ),
      )
      .sort((a, b) => {
        // Prefer exact «आरती परमानंदा» when question mentions परमानंद आरती
        const qWantsParamananda =
          /परमानंद/.test(question) && /आरती/.test(question);
        const aBoost =
          qWantsParamananda && /आरती परमानंदा/.test(a.k.title + a.k.body.slice(0, 80))
            ? 20
            : 0;
        const bBoost =
          qWantsParamananda && /आरती परमानंदा/.test(b.k.title + b.k.body.slice(0, 80))
            ? 20
            : 0;
        return b.score + bBoost - (a.score + aBoost);
      })
      .slice(0, 3);
    if (aarti.length) {
      return aarti.map((s) => `【${s.k.title}】\n${s.k.body}`).join("\n\n");
    }
  }

  if (asksRatne) {
    const allRatne = scored.filter((s) => /^रत्न\s*\d+/i.test(s.k.title));
    if (/चौदा|सर्व|पूर्ण|रत्ने/i.test(question) && allRatne.length) {
      // Full set of 14, stable by number
      const ordered = allRatne
        .slice()
        .sort((a, b) => {
          const na = Number((a.k.title.match(/\d+/) || ["0"])[0]);
          const nb = Number((b.k.title.match(/\d+/) || ["0"])[0]);
          return na - nb;
        });
      return ordered.map((s) => `【${s.k.title}】\n${s.k.body}`).join("\n\n");
    }
    const ratne = scored
      .filter((s) => s.score >= 2 && /रत्न|उपदेश/i.test(s.k.title))
      .slice(0, 5);
    if (ratne.length) {
      return ratne.map((s) => `【${s.k.title}】\n${s.k.body}`).join("\n\n");
    }
  }

  // Prefer आत्मप्रभा chunks when topic/question matches
  if (asksAtma || (topicTitle && /मी कोण|आत्मप्रभा|सोहं/i.test(topicTitle))) {
    const atma = scored
      .filter((s) => s.score >= 3 && /आत्मप्रभा|विभाग/i.test(s.k.title))
      .slice(0, 2);
    if (atma.length) {
      return atma.map((s) => `【${s.k.title}】\n${s.k.body}`).join("\n\n");
    }
  }

  const relevant = scored.filter((s) => s.score >= 3).slice(0, 3);
  if (relevant.length === 0) {
    return `【सामान्य परमानंद साहित्य】\nप्रश्नाशी थेट जुळणारा जतन झालेला मजकूर यावेळी सापडला नाही. फक्त दिलेल्या आत्मप्रभा / आरती / उपदेश रत्ने साहित्यातून उत्तर द्या — अजपा जप टेम्प्लेट किंवा कल्पित मजकूर देऊ नका. आवश्यक असल्यास मधुसुदनदास विजयानंद यांच्याकडे मार्गदर्शन मागा.`;
  }

  return relevant.map((s) => `【${s.k.title}】\n${s.k.body}`).join("\n\n");
}
