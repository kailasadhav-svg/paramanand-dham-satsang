/**
 * Load & chunk Paramanand literature markdown from data/literature/.
 * Used as the authoritative corpus for अजपा answers (no invented text).
 */
import fs from "fs";
import path from "path";

export type LiteratureChunk = {
  title: string;
  keywords: string[];
  body: string;
};

const LITERATURE_DIR = path.join(process.cwd(), "data", "literature");

const CORPUS_FILES = [
  "atmaprabha-01-58.md",
  "aartya-va-chauda-upadesh.md",
] as const;

let cached: LiteratureChunk[] | null = null;

const STOP = new Set([
  "आणि",
  "किंवा",
  "तसेच",
  "हे",
  "ही",
  "होय",
  "नाही",
  "तर",
  "पण",
  "मग",
  "असते",
  "आहे",
  "करावें",
  "करावे",
  "करता",
  "केले",
  "या",
  "त्या",
  "तो",
  "ती",
  "ते",
  "एक",
  "दोन्ही",
  "सर्व",
  "काय",
  "कसे",
  "कशी",
  "कोण",
  "the",
  "and",
  "for",
  "with",
]);

function tokens(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[*#_`>【】\[\]()«»""'']/g, " ")
    .split(/[\s|,.;:?!\/\\-—–…]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function keywordsFrom(title: string, body: string): string[] {
  const fromTitle = tokens(title);
  const fromBody = tokens(body.slice(0, 400)).slice(0, 40);
  const extras: string[] = [];
  if (/आरती|आरति/i.test(title + body.slice(0, 200))) {
    extras.push("आरती", "aarti", "arti", "पाठ", "अर्थ");
  }
  if (/रत्न|उपदेश/i.test(title)) {
    extras.push("रत्न", "उपदेश", "चौदा", "रत्ने");
  }
  if (/आत्मप्रभा|विभाग/i.test(title)) {
    extras.push("आत्मप्रभा", "उपदेश", "संदेश");
  }
  if (/भूपाळी|भुपाळी/i.test(title + body.slice(0, 80))) {
    extras.push("भूपाळी", "भुपाळी", "पहाट");
  }
  if (/परमहंस/i.test(title + body.slice(0, 120))) {
    extras.push("परमहंस", "सोहं", "सोऽहं");
  }
  if (/अजपा|सोहं|सोऽहं/i.test(title + body.slice(0, 300))) {
    extras.push("अजपा", "जप", "सोहं", "सोऽहं");
  }
  return Array.from(new Set([...fromTitle, ...fromBody, ...extras]));
}

/** Split markdown on ## headers (keep header line with chunk). */
function splitByH2(markdown: string): { title: string; body: string }[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: { title: string; body: string }[] = [];
  let title = "";
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (!title && !body) return;
    if (!title) title = "साहित्य";
    if (body.length < 20) return;
    chunks.push({ title: title.trim(), body });
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      title = h2[1].replace(/#+$/, "").trim();
      buf = [line];
      continue;
    }
    // Promote # title only if no ## yet
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !title && buf.length === 0) {
      title = h1[1].trim();
      buf = [line];
      continue;
    }
    buf.push(line);
  }
  flush();
  return chunks;
}

function enrichAtmaprabhaTitle(title: string, body: string): string {
  const h3 = body.match(/^###\s+(.+)$/m);
  if (h3) {
    const sub = h3[1].trim();
    if (!title.includes(sub.slice(0, 20))) {
      return `${title} — ${sub}`;
    }
  }
  return title;
}

function readFileSafe(name: string): string | null {
  const full = path.join(LITERATURE_DIR, name);
  try {
    return fs.readFileSync(full, "utf8");
  } catch (err) {
    console.error("Literature file missing:", full, err);
    return null;
  }
}

function parseCorpus(): LiteratureChunk[] {
  const entries: LiteratureChunk[] = [];

  const atma = readFileSafe("atmaprabha-01-58.md");
  if (atma) {
    for (const chunk of splitByH2(atma)) {
      const title = enrichAtmaprabhaTitle(chunk.title, chunk.body);
      entries.push({
        title,
        keywords: keywordsFrom(title, chunk.body),
        body: chunk.body,
      });
    }
  }

  const aartya = readFileSafe("aartya-va-chauda-upadesh.md");
  if (aartya) {
    for (const chunk of splitByH2(aartya)) {
      if (chunk.body.length < 40) continue;
      entries.push({
        title: chunk.title,
        keywords: keywordsFrom(chunk.title, chunk.body),
        body: chunk.body,
      });
    }
  }

  return entries;
}

/** All literature chunks (cached). */
export function loadLiteratureCorpus(): LiteratureChunk[] {
  if (cached) return cached;
  cached = parseCorpus();
  return cached;
}

/** Test helper — force re-read. */
export function clearLiteratureCache(): void {
  cached = null;
}

export function literatureCorpusStats(): { files: string[]; chunks: number } {
  return {
    files: CORPUS_FILES.slice(),
    chunks: loadLiteratureCorpus().length,
  };
}
