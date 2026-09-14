import { getDb, getPlace } from "@/lib/db";
import { detectStaffRole, roleLabelMarathi } from "@/lib/roles";
import { generateAjapaAiAnswer } from "./ai";
import { normalizePhone } from "./phone";
import { createAjapaQuestion, findAjapaByQuestionText } from "./store";
import type { AjapaQuestion } from "./types";

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function seekerDisplayName(phone: string): string {
  return roleLabelMarathi(detectStaffRole(phone));
}

/** Copy a weekly प्रश्नोत्तर row into अजपा संवाद (literature answer). */
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

  const existing = await findAjapaByQuestionText(text);
  if (existing) return existing;

  const phone = normalizePhone(input.seeker_phone);
  if (!phone) return null;

  let placeName = input.place_name ?? null;
  if (!placeName && input.place_id) {
    const place = await getPlace(input.place_id);
    placeName = place?.name ?? null;
  }

  const name = input.seeker_name?.trim() || seekerDisplayName(phone);

  const { answer } = await generateAjapaAiAnswer(text, {
    place_name: placeName,
    meeting_date: input.asked_on ?? null,
  });

  return createAjapaQuestion({
    seeker_phone: phone,
    seeker_name: name,
    question: text,
    ai_answer: answer,
  });
}

type WeeklyRow = {
  id: number;
  question: string;
  place_id: number | null;
  place_name: string | null;
  asked_on: string | null;
};

async function listWeeklyMissingFromAjapa(from: string, limit: number): Promise<WeeklyRow[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT q.id, q.question, q.place_id, q.asked_on, p.name AS place_name
      FROM questions q
      LEFT JOIN places p ON p.id = q.place_id
      WHERE q.asked_on >= ?
        AND NOT EXISTS (
          SELECT 1 FROM ajapa_questions a
          WHERE lower(trim(a.question)) = lower(trim(q.question))
        )
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT ?`,
    args: [from, limit],
  });
  return rs.rows.map((row) => ({
    id: Number(row.id),
    question: String(row.question || ""),
    place_id: row.place_id == null ? null : Number(row.place_id),
    place_name: row.place_name == null ? null : String(row.place_name),
    asked_on: row.asked_on == null ? null : String(row.asked_on),
  }));
}

/**
 * Backfill: weekly questions from the last N days that are not yet in संवाद.
 * Cap per request so sync stays responsive.
 */
export async function mirrorRecentWeeklyQuestions(opts?: {
  days?: number;
  limit?: number;
  default_seeker_phone?: string;
}): Promise<number> {
  const days = opts?.days ?? 21;
  const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 20);
  const from = ymdDaysAgo(days);
  const missing = await listWeeklyMissingFromAjapa(from, limit);
  if (!missing.length) return 0;

  const seeker =
    (opts?.default_seeker_phone && normalizePhone(opts.default_seeker_phone)) ||
    normalizePhone(process.env.NEXT_PUBLIC_SOFTWARE_PHONE || "9225118811");
  if (!seeker) return 0;

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
    created += 1;
  }
  return created;
}
