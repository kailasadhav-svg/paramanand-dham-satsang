import { getDb, getPlace, getSatsangiByPhone } from "@/lib/db";
import { detectStaffRole, roleLabelMarathi } from "@/lib/roles";
import { generateAjapaAiAnswer } from "./ai";
import { normalizePhone } from "./phone";
import { polishSeekerAnswer } from "./polish";
import { createAjapaQuestion, findAjapaBySeekerAndQuestion } from "./store";
import type { AjapaQuestion } from "./types";

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

async function seekerDisplayName(phone: string): Promise<string> {
  try {
    const member = await getSatsangiByPhone(phone);
    if (member?.name?.trim()) return member.name.trim();
  } catch {
    /* table may be empty */
  }
  return roleLabelMarathi(detectStaffRole(phone));
}

/** Keep प्रश्नोत्तर in sync so «उत्तर प्रलंबित» does not stick after संवाद answer. */
async function fillWeeklyAnswerIfEmpty(question: string, answer: string) {
  try {
    const db = await getDb();
    await db.execute({
      sql: `UPDATE questions
        SET answer = ?, answered_by = 'atmaprabha', updated_at = ?
        WHERE lower(trim(question)) = lower(trim(?))
          AND (answer IS NULL OR trim(answer) = '')`,
      args: [polishSeekerAnswer(answer).slice(0, 12000), nowIso(), question.trim()],
    });
  } catch (err) {
    console.error("fillWeeklyAnswerIfEmpty", err);
  }
}

/** Copy a weekly प्रश्नोत्तर into अजपा संवाद for this seeker (literature / AI answer). */
export async function mirrorWeeklyQuestionToAjapa(input: {
  question: string;
  place_id?: number | null;
  place_name?: string | null;
  asked_on?: string | null;
  seeker_phone: string;
  seeker_name?: string | null;
}): Promise<AjapaQuestion | null> {
  const text = input.question.trim();
  if (!text) return null;

  const phone = normalizePhone(input.seeker_phone);
  if (!phone) return null;

  const existing = await findAjapaBySeekerAndQuestion(phone, text);
  if (existing) {
    if (existing.ai_answer) await fillWeeklyAnswerIfEmpty(text, existing.ai_answer);
    return existing;
  }

  let placeName = input.place_name ?? null;
  if (!placeName && input.place_id) {
    const place = await getPlace(input.place_id);
    placeName = place?.name ?? null;
  }

  const name =
    input.seeker_name?.trim() || (await seekerDisplayName(phone));

  const { answer } = await generateAjapaAiAnswer(text, {
    place_name: placeName,
    meeting_date: input.asked_on ?? null,
  });

  const row = await createAjapaQuestion({
    seeker_phone: phone,
    seeker_name: name,
    question: text,
    ai_answer: answer,
  });
  await fillWeeklyAnswerIfEmpty(text, answer);
  return row;
}

type WeeklyRow = {
  id: number;
  question: string;
  place_id: number | null;
  place_name: string | null;
  asked_on: string | null;
  asked_by_phone: string | null;
};

/**
 * Weekly rows for this seeker that are not yet in संवाद under their phone.
 * Also includes recent rows with NULL asked_by (legacy) so first sync can claim them
 * only when mirrorForOrphans is true (charansevak with empty list).
 */
async function listWeeklyMissingForSeeker(opts: {
  from: string;
  seeker: string;
  limit: number;
  includeNullAsker: boolean;
}): Promise<WeeklyRow[]> {
  const db = await getDb();
  const askerClause = opts.includeNullAsker
    ? `(q.asked_by_phone = ? OR q.asked_by_phone IS NULL OR trim(q.asked_by_phone) = '')`
    : `q.asked_by_phone = ?`;
  const rs = await db.execute({
    sql: `SELECT q.id, q.question, q.place_id, q.asked_on, q.asked_by_phone, p.name AS place_name
      FROM questions q
      LEFT JOIN places p ON p.id = q.place_id
      WHERE q.asked_on >= ?
        AND ${askerClause}
        AND NOT EXISTS (
          SELECT 1 FROM ajapa_questions a
          WHERE a.seeker_phone = ?
            AND lower(trim(a.question)) = lower(trim(q.question))
        )
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT ?`,
    args: [opts.from, opts.seeker, opts.seeker, opts.limit],
  });
  return rs.rows.map((row) => ({
    id: Number(row.id),
    question: String(row.question || ""),
    place_id: row.place_id == null ? null : Number(row.place_id),
    place_name: row.place_name == null ? null : String(row.place_name),
    asked_on: row.asked_on == null ? null : String(row.asked_on),
    asked_by_phone:
      row.asked_by_phone == null ? null : String(row.asked_by_phone),
  }));
}

/**
 * Backfill संवाद for one seeker. Prefer asked_by_phone match.
 * includeNullAsker: claim legacy weekly questions that never got a seeker.
 */
export async function mirrorRecentWeeklyQuestions(opts?: {
  days?: number;
  limit?: number;
  default_seeker_phone?: string;
  include_null_asker?: boolean;
}): Promise<number> {
  const seeker = opts?.default_seeker_phone
    ? normalizePhone(opts.default_seeker_phone)
    : "";
  if (!seeker) return 0;

  const days = opts?.days ?? 21;
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 20);
  const from = ymdDaysAgo(days);
  const missing = await listWeeklyMissingForSeeker({
    from,
    seeker,
    limit,
    includeNullAsker: Boolean(opts?.include_null_asker),
  });
  if (!missing.length) return 0;

  let created = 0;
  for (const q of missing) {
    const text = q.question.trim();
    if (!text) continue;
    await mirrorWeeklyQuestionToAjapa({
      question: text,
      place_id: q.place_id,
      place_name: q.place_name,
      asked_on: q.asked_on,
      seeker_phone: seeker,
    });
    // Stamp asker if missing so later syncs stay correct.
    if (!q.asked_by_phone) {
      try {
        const db = await getDb();
        await db.execute({
          sql: `UPDATE questions SET asked_by_phone = ? WHERE id = ? AND (asked_by_phone IS NULL OR trim(asked_by_phone) = '')`,
          args: [seeker, q.id],
        });
      } catch {
        /* non-fatal */
      }
    }
    created += 1;
  }
  return created;
}
