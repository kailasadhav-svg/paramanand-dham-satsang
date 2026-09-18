import type { Row } from "@libsql/client";
import { getDb } from "./db";
import { defaultThursdayYmd } from "./dates";
import type { Member } from "./members";

export type WeeklyQuestion = {
  id: number;
  week_start: string;
  question: string;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyAnswer = {
  id: number;
  weekly_question_id: number;
  member_id: number;
  answer: string;
  created_at: string;
  member_name?: string;
  place_code?: string;
};

export class WeeklyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function num(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function strOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s.length ? s : null;
}

function asQuestion(row: Row): WeeklyQuestion {
  return {
    id: num(row.id),
    week_start: str(row.week_start),
    question: str(row.question),
    source: strOrNull(row.source),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

function asAnswer(row: Row): WeeklyAnswer {
  return {
    id: num(row.id),
    weekly_question_id: num(row.weekly_question_id),
    member_id: num(row.member_id),
    answer: str(row.answer),
    created_at: str(row.created_at),
    member_name: row.member_name == null ? undefined : str(row.member_name),
    place_code: row.place_code == null ? undefined : str(row.place_code),
  };
}

export async function getWeeklyQuestion(weekStart: string): Promise<WeeklyQuestion | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM weekly_questions WHERE week_start = ?",
    args: [weekStart],
  });
  return rs.rows[0] ? asQuestion(rs.rows[0]) : undefined;
}

export async function upsertWeeklyQuestion(input: {
  week_start: string;
  question: string;
  source?: string | null;
}): Promise<WeeklyQuestion> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.week_start)) {
    throw new WeeklyError("अवैध तारीख", 400);
  }
  const question = input.question.trim();
  if (!question) throw new WeeklyError("विषय लिहा", 400);
  const source = input.source?.trim() || null;
  const now = new Date().toISOString();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO weekly_questions (week_start, question, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET
         question = excluded.question,
         source = excluded.source,
         updated_at = excluded.updated_at`,
    args: [input.week_start, question, source, now, now],
  });
  const saved = await getWeeklyQuestion(input.week_start);
  if (!saved) throw new WeeklyError("विषय जतन अयशस्वी", 500);
  return saved;
}

export async function getMemberAnswer(
  weeklyQuestionId: number,
  memberId: number,
): Promise<WeeklyAnswer | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM weekly_answers WHERE weekly_question_id = ? AND member_id = ?",
    args: [weeklyQuestionId, memberId],
  });
  return rs.rows[0] ? asAnswer(rs.rows[0]) : undefined;
}

export async function submitWeeklyAnswer(input: {
  memberId: number;
  week_start?: string;
  answer: string;
}): Promise<WeeklyAnswer> {
  const weekStart = input.week_start || defaultThursdayYmd();
  const q = await getWeeklyQuestion(weekStart);
  if (!q) throw new WeeklyError("या आठवड्याचा विषय नाही", 404);
  const existing = await getMemberAnswer(q.id, input.memberId);
  if (existing) throw new WeeklyError("चिंतन आधी नोंदले आहे", 409);
  const answer = input.answer.trim();
  if (!answer) throw new WeeklyError("चिंतन लिहा", 400);
  if (answer.length > 4000) throw new WeeklyError("चिंतन खूप मोठे आहे", 400);
  const now = new Date().toISOString();
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: `INSERT INTO weekly_answers (weekly_question_id, member_id, answer, created_at)
         VALUES (?, ?, ?, ?)`,
      args: [q.id, input.memberId, answer, now],
    });
    const id = Number(result.lastInsertRowid);
    const rs = await db.execute({
      sql: "SELECT * FROM weekly_answers WHERE id = ?",
      args: [id],
    });
    if (!rs.rows[0]) throw new WeeklyError("चिंतन जतन अयशस्वी", 500);
    return asAnswer(rs.rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/UNIQUE|unique/i.test(message)) {
      throw new WeeklyError("चिंतन आधी नोंदले आहे", 409);
    }
    throw err;
  }
}

export async function listWeeklyAnswers(weeklyQuestionId: number): Promise<WeeklyAnswer[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT a.*, m.name AS member_name, m.place_code AS place_code
       FROM weekly_answers a
       JOIN members m ON m.id = a.member_id
       WHERE a.weekly_question_id = ?
       ORDER BY a.id`,
    args: [weeklyQuestionId],
  });
  return rs.rows.map(asAnswer);
}

export async function memberWeeklyView(
  member: Member,
  weekStart = defaultThursdayYmd(),
): Promise<{
  week_start: string;
  question: WeeklyQuestion | null;
  answer: WeeklyAnswer | null;
}> {
  const question = (await getWeeklyQuestion(weekStart)) ?? null;
  const answer = question ? ((await getMemberAnswer(question.id, member.id)) ?? null) : null;
  return { week_start: weekStart, question, answer };
}

