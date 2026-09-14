/**
 * Keyword gate — bot starts ONLY when these words appear.
 * Does not touch other WhatsApp traffic on the same WABA number.
 */
export const GATE_KEYWORDS = [
  "अजपा",
  "अजापा",
  "ajapa",
  "ajpa",
  "soham",
  "सोहं",
  "सोऽहं",
  "सोहम्",
] as const;

/** Prefix used in Q/A commands (any of the gate words). */
export const KEYWORD_PREFIX_RE =
  "(?:अजपा|अजापा|ajapa|ajpa|soham|सोहं|सोऽहं|सोहम्)";

export function isGateKeywordOnly(text: string): boolean {
  const t = text.trim();
  return new RegExp(`^${KEYWORD_PREFIX_RE}$`, "i").test(t);
}

export function startsWithGateKeyword(text: string): boolean {
  return new RegExp(`^${KEYWORD_PREFIX_RE}\\b`, "i").test(text.trim());
}

export function parseQuestionCommand(text: string): string | null {
  const m = text
    .trim()
    .match(new RegExp(`^${KEYWORD_PREFIX_RE}\\s*q\\s*[:\\-]?\\s*(.+)$`, "i"));
  if (!m) return null;
  const q = m[1].trim();
  return q.length ? q : null;
}

export function parseAnswerCommand(text: string): string | null {
  const m = text
    .trim()
    .match(new RegExp(`^${KEYWORD_PREFIX_RE}\\s*a\\s*[:\\-]?\\s*(.+)$`, "i"));
  if (!m) return null;
  return m[1].trim() || null;
}

export function appPublicUrl(): string {
  return (
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://satsang.dhyeyapurti.in/ajapa"
  );
}

/** Beautiful welcome — session message only (no Meta template). */
export function welcomeMessage(): string {
  return `🙏 हरि ॐ परमानंद

परमानंद धाम · अजपा / सोऽहं संवाद

तुमचे स्वागत आहे.

▶ प्रश्न विचारा
   \`अजपा Q\` तुमचा प्रश्न
   किंवा \`SOHAM Q\` …

▶ गुरु उत्तर (मधुसुदनदास)
   \`अजपा A\` ९८xxxxxxxx

▶ अ‍ॅप
   ${appPublicUrl()}

खालील बटण दाबा, किंवा थेट कमांड लिहा.

|| हरि ॐ परमानंद विश्वव्यापकम् ||`;
}

export function askQuestionPrompt(): string {
  return `तुमचा प्रश्न लिहा.

उदाहरण:
अजपा Q अजपा जप कसा स्थिर ठेवावा?

किंवा फक्त प्रश्न लिहा (आता).`;
}
