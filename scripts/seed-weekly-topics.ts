/**
 * पुढील प्रत्येक गुरुवारसाठी एक विषय (ओळीनुसार) weekly_questions मध्ये भरा.
 * आधीच विषय असलेले आठवडे वगळले जातात (overwrite नाही).
 *
 *   npx tsx scripts/seed-weekly-topics.ts                       # data/atmaprabha-topics.txt, पुढचा गुरुवार पासून
 *   npx tsx scripts/seed-weekly-topics.ts --dry-run             # फक्त यादी दाखवा
 *   npx tsx scripts/seed-weekly-topics.ts --from 2026-11-12     # या गुरुवारपासून
 *   npx tsx scripts/seed-weekly-topics.ts --file path.txt --source "आत्मप्रभा"
 *
 * फाइल: एका ओळीवर एक विषय; रिकाम्या ओळी व # ने सुरू होणाऱ्या ओळी वगळल्या जातात.
 */
import fs from "fs";
import path from "path";
import { addDaysYmd, defaultThursdayYmd, formatMarathiDate, ymdInIndia } from "../lib/dates";
import { getDb } from "../lib/db";
import { getWeeklyQuestion, upsertWeeklyQuestion } from "../lib/weekly";

type Opts = { file: string; from: string | null; source: string; dryRun: boolean };

function parseArgs(argv: string[]): Opts {
  const opts: Opts = {
    file: path.join(process.cwd(), "data", "atmaprabha-topics.txt"),
    from: null,
    source: "आत्मप्रभा · विषयानुक्रमणिका",
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--file") opts.file = path.resolve(argv[++i] ?? "");
    else if (a === "--from") opts.from = argv[++i] ?? null;
    else if (a === "--source") opts.source = argv[++i] ?? opts.source;
    else throw new Error(`अज्ञात पर्याय: ${a}`);
  }
  if (opts.from && !/^\d{4}-\d{2}-\d{2}$/.test(opts.from)) {
    throw new Error("--from YYYY-MM-DD स्वरूपात हवे");
  }
  return opts;
}

export function readTopics(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((l) => l && !l.startsWith("#"));
}

/** First Thursday strictly after today (India), or the given date if it is a Thursday. */
export function firstThursday(from: string | null, now = new Date()): string {
  if (from) {
    const [y, m, d] = from.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 6, 30));
    if (dt.getUTCDay() !== 4) throw new Error(`${from} गुरुवार नाही`);
    return from;
  }
  const thisThu = defaultThursdayYmd(now);
  return thisThu > ymdInIndia(now) ? thisThu : addDaysYmd(thisThu, 7);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const topics = readTopics(fs.readFileSync(opts.file, "utf8"));
  if (!topics.length) throw new Error(`${opts.file} मध्ये विषय नाहीत`);

  // पुन्हा चालवल्यास तेच विषय दुसऱ्यांदा भरू नयेत
  const db = await getDb();
  const seeded = await db.execute({
    sql: "SELECT question, week_start FROM weekly_questions WHERE source = ?",
    args: [opts.source],
  });
  const already = new Map(seeded.rows.map((r) => [String(r.question), String(r.week_start)]));

  let week = firstThursday(opts.from);
  let added = 0;
  let skipped = 0;
  let repeated = 0;
  const plan: { week: string; topic: string; status: string }[] = [];

  for (const topic of topics) {
    const seededWeek = already.get(topic);
    if (seededWeek) {
      plan.push({ week: seededWeek, topic, status: "आधीच भरलेला" });
      repeated++;
      continue;
    }
    // आधीच विषय असलेला आठवडा वगळा — त्या आठवड्याचा विषय तसाच राहतो, पुढचा विषय पुढच्या रिकाम्या गुरुवारी
    for (;;) {
      const existing = await getWeeklyQuestion(week);
      if (!existing) break;
      plan.push({ week, topic: existing.question, status: "आधीचा (ठेवला)" });
      skipped++;
      week = addDaysYmd(week, 7);
    }
    plan.push({ week, topic, status: opts.dryRun ? "भरणार" : "भरला" });
    if (!opts.dryRun) {
      await upsertWeeklyQuestion({ week_start: week, question: topic, source: opts.source });
    }
    added++;
    week = addDaysYmd(week, 7);
  }

  for (const p of plan) {
    console.log(`${p.week}  ${formatMarathiDate(p.week).padEnd(28)} ${p.status.padEnd(14)} ${p.topic}`);
  }
  const filled = plan.filter((p) => p.status === "भरला" || p.status === "भरणार");
  console.log("");
  console.log(
    `${opts.dryRun ? "(dry-run) " : ""}विषय: ${topics.length} · नवे गुरुवार: ${added}` +
      (skipped ? ` (+${skipped} आठवडे आधीच्या विषयासह वगळले)` : "") +
      (repeated ? ` (${repeated} विषय आधीच भरलेले)` : "") +
      (filled.length
        ? ` · पहिला: ${filled[0].week} · शेवटचा: ${filled[filled.length - 1].week}`
        : " · काहीही भरायचे नाही"),
  );
}

if (process.argv[1] && /seed-weekly-topics\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
