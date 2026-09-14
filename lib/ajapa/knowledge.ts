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

/** Small flow seeds (not full books) — merged after corpus. */
const APP_SEEDS: KnowledgeEntry[] = [
  {
    title: "सत्संग आणि प्रश्न",
    keywords: ["सत्संग", "गुरुवार", "उपस्थिती", "विषय", "प्रश्न", "सेवा", "अजपा"],
    body: `गुरुवारी सत्संग म्हणजे एकत्र श्रवण, चिंतन आणि सेवा. उपस्थिती, विषय श्रवण आणि प्रश्न ही साधना व्यवस्थित ठेवण्याची पद्धत आहे. प्रश्नाचे उत्तर परमानंद साहित्य (आत्मप्रभा / आरत्या / उपदेश रत्ने) किंवा गुरुंकडून येऊ शकते. साहित्य प्रारंभिक दिशा देते; अंतिम निर्णयासाठी गुरुकृपा महत्त्वाची.`,
  },
  {
    title: "गुरुकृपा",
    keywords: ["गुरु", "गुरुकृपा", "मधुसुदन", "मधुसूदन", "विजयानंद", "मार्गदर्शन"],
    body: `मधुसुदनदास विजयानंद यांच्याकडे प्रश्न पाठवणे म्हणजे श्रद्धेने मार्गदर्शन मागणे. उत्तर आल्यावर कृतज्ञतेने स्वीकारा. तुलना करू नका; आपल्या प्रश्नाचे उत्तर आपल्या पात्रतेनुसार येते.`,
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
    const wantsMeaning = /अर्थ|उलगडा|समजाव/i.test(question);
    const qWantsParamananda = /परमानंद/.test(question) && /आरती/.test(question);
    const aarti = scored
      .filter(
        (s) =>
          /आरती|परमहंस|भूपाळी|भुपाळी|स्तुति|स्तुती/i.test(s.k.title) ||
          /॥\s*आरती|नारायण सरस्वती|तू एक परमहंस|॥\s*भुपाळी|॥\s*भूपाळी/i.test(
            s.k.body.slice(0, 400),
          ),
      )
      .map((s) => {
        let boost = 0;
        if (qWantsParamananda && /आरती परमानंदा/.test(s.k.title)) boost += 30;
        // Prefer proof digest (short ध्रुवपद form) over long OCR dump
        if (/ध्रुवपद|अर्थ —/.test(s.k.body.slice(0, 200))) boost += 12;
        if (wantsMeaning && /अर्थ/.test(s.k.body)) boost += 8;
        // Deprioritize numbered OCR chapter duplicates of the same aarti
        if (/^\d+\.\s*आरती परमानंदा/.test(s.k.title)) boost -= 10;
        return { ...s, score: s.score + boost };
      })
      .sort((a, b) => b.score - a.score);

    const picked: typeof aarti = [];
    for (const row of aarti) {
      const key = normalizeForMatch(row.k.title).replace(/^\d+\.\s*/, "");
      if (picked.some((p) => normalizeForMatch(p.k.title).replace(/^\d+\.\s*/, "") === key)) {
        continue;
      }
      // Skip near-duplicate full texts of the same aarti
      if (
        /आरती परमानंदा/.test(row.k.title) &&
        picked.some((p) => /आरती परमानंदा/.test(p.k.title))
      ) {
        continue;
      }
      picked.push(row);
      if (picked.length >= (wantsMeaning ? 2 : 1)) break;
    }
    if (picked.length) {
      return joinEntries(picked.map((s) => s.k));
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
      return joinEntries(ordered.map((s) => s.k));
    }
    const ratne = scored
      .filter((s) => s.score >= 2 && /रत्न|उपदेश/i.test(s.k.title))
      .slice(0, 5);
    if (ratne.length) {
      return joinEntries(ratne.map((s) => s.k));
    }
  }

  // Prefer आत्मप्रभा chunks when topic/question matches
  if (asksAtma || (topicTitle && /मी कोण|आत्मप्रभा|सोहं/i.test(topicTitle))) {
    const atma = scored
      .filter((s) => s.score >= 3 && /आत्मप्रभा|विभाग/i.test(s.k.title))
      .slice(0, 2);
    if (atma.length) {
      return joinEntries(atma.map((s) => s.k));
    }
  }

  const relevant = scored.filter((s) => s.score >= 3).slice(0, 3);
  if (relevant.length === 0) {
    return `प्रश्नाशी थेट जुळणारा जतन झालेला मजकूर यावेळी सापडला नाही. आवश्यक असल्यास मधुसुदनदास विजयानंद यांच्याकडे मार्गदर्शन मागा.`;
  }

  return joinEntries(relevant.map((s) => s.k));
}

function joinEntries(entries: KnowledgeEntry[]): string {
  return entries
    .map((k) => {
      const title = k.title.replace(/^\d+\.\s*/, "").trim();
      const body = k.body.replace(/^#{1,6}\s+.+\n+/, "").trim();
      return `${title}\n\n${body}`;
    })
    .join("\n\n———\n\n");
}
