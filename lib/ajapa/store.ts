import type { Row } from "@libsql/client";
import { getDb } from "@/lib/db";
import type {
  AjapaQuestion,
  AjapaSessionState,
  AjapaStatus,
  AjapaVisibility,
  WaSession,
} from "./types";
import { phonesEqual } from "./phone";

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
  return String(value);
}

function asStatus(value: unknown): AjapaStatus {
  if (value === "ai_answered" || value === "escalated" || value === "guru_answered") {
    return value;
  }
  return "ai_answered";
}

function asVisibility(value: unknown): AjapaVisibility {
  return value === "public" ? "public" : "private";
}

function asTopicKind(value: unknown): "atmaprabha" | "upadesh" | null {
  if (value === "atmaprabha" || value === "upadesh") return value;
  return null;
}

function asState(value: unknown): AjapaSessionState {
  const ok: AjapaSessionState[] = [
    "idle",
    "awaiting_escalate_choice",
    "guru_awaiting_mode",
    "guru_awaiting_text",
    "guru_awaiting_voice",
  ];
  return ok.includes(value as AjapaSessionState) ? (value as AjapaSessionState) : "idle";
}

function asAjapa(row: Row): AjapaQuestion {
  return {
    id: num(row.id),
    seeker_phone: str(row.seeker_phone),
    seeker_name: strOrNull(row.seeker_name),
    question: str(row.question),
    ai_answer: strOrNull(row.ai_answer),
    status: asStatus(row.status),
    visibility: asVisibility(row.visibility),
    guru_answer_text: strOrNull(row.guru_answer_text),
    guru_answer_audio_url: strOrNull(row.guru_answer_audio_url),
    guru_answer_audio_media_id: strOrNull(row.guru_answer_audio_media_id),
    place_id: row.place_id == null ? null : num(row.place_id),
    place_name: strOrNull(row.place_name),
    meeting_date: strOrNull(row.meeting_date),
    topic_kind: asTopicKind(row.topic_kind),
    topic_title: strOrNull(row.topic_title),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    escalated_at: strOrNull(row.escalated_at),
    answered_at: strOrNull(row.answered_at),
  };
}

function asSession(row: Row): WaSession {
  return {
    phone: str(row.phone),
    state: asState(row.state),
    ajapa_question_id: row.ajapa_question_id == null ? null : num(row.ajapa_question_id),
    last_inbound_at: str(row.last_inbound_at),
    updated_at: str(row.updated_at),
  };
}

function nowIso() {
  return new Date().toISOString();
}

/** Who may see a question (private stays with owner + staff). */
export function canViewAjapaQuestion(
  q: AjapaQuestion,
  viewerPhone: string,
  viewerRole: string,
): boolean {
  if (q.visibility === "public") return true;
  if (viewerRole === "software" || viewerRole === "guru") return true;
  return phonesEqual(viewerPhone, q.seeker_phone);
}

export async function getWaSession(phone: string): Promise<WaSession | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM wa_sessions WHERE phone = ?",
    args: [phone],
  });
  return rs.rows[0] ? asSession(rs.rows[0]) : undefined;
}

export async function touchWaSession(phone: string): Promise<WaSession> {
  const db = await getDb();
  const existing = await getWaSession(phone);
  const now = nowIso();
  await db.execute({
    sql: `INSERT INTO wa_sessions (phone, state, ajapa_question_id, last_inbound_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        last_inbound_at = excluded.last_inbound_at,
        updated_at = excluded.updated_at`,
    args: [
      phone,
      existing?.state ?? "idle",
      existing?.ajapa_question_id ?? null,
      now,
      now,
    ],
  });
  return (await getWaSession(phone))!;
}

export async function setWaSessionState(
  phone: string,
  state: AjapaSessionState,
  ajapa_question_id?: number | null,
): Promise<void> {
  const db = await getDb();
  const existing = await getWaSession(phone);
  const now = nowIso();
  const qid =
    ajapa_question_id !== undefined ? ajapa_question_id : (existing?.ajapa_question_id ?? null);
  await db.execute({
    sql: `INSERT INTO wa_sessions (phone, state, ajapa_question_id, last_inbound_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        state = excluded.state,
        ajapa_question_id = excluded.ajapa_question_id,
        updated_at = excluded.updated_at`,
    args: [phone, state, qid, existing?.last_inbound_at ?? now, now],
  });
}

export async function createAjapaQuestion(input: {
  seeker_phone: string;
  seeker_name?: string | null;
  question: string;
  ai_answer: string;
  visibility?: AjapaVisibility;
  place_id?: number | null;
  place_name?: string | null;
  meeting_date?: string | null;
  topic_kind?: "atmaprabha" | "upadesh" | null;
  topic_title?: string | null;
}): Promise<AjapaQuestion> {
  const now = nowIso();
  const visibility: AjapaVisibility =
    input.visibility === "public" ? "public" : "private";
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO ajapa_questions (
      seeker_phone, seeker_name, question, ai_answer, status, visibility,
      guru_answer_text, guru_answer_audio_url, guru_answer_audio_media_id,
      place_id, place_name, meeting_date, topic_kind, topic_title,
      created_at, updated_at, escalated_at, answered_at
    ) VALUES (?, ?, ?, ?, 'ai_answered', ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    args: [
      input.seeker_phone,
      input.seeker_name ?? null,
      input.question.trim(),
      input.ai_answer,
      visibility,
      input.place_id ?? null,
      input.place_name ?? null,
      input.meeting_date ?? null,
      input.topic_kind ?? null,
      input.topic_title ?? null,
      now,
      now,
    ],
  });
  const id = Number(result.lastInsertRowid);
  const saved = await getAjapaQuestion(id);
  if (!saved) throw new Error("Failed to save ajapa question");
  return saved;
}

export async function getAjapaQuestion(id: number): Promise<AjapaQuestion | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM ajapa_questions WHERE id = ?",
    args: [id],
  });
  return rs.rows[0] ? asAjapa(rs.rows[0]) : undefined;
}

export async function escalateAjapaQuestion(id: number): Promise<AjapaQuestion | undefined> {
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ajapa_questions
      SET status = 'escalated', escalated_at = ?, updated_at = ?
      WHERE id = ? AND status = 'ai_answered'`,
    args: [now, now, id],
  });
  return getAjapaQuestion(id);
}

/**
 * एका गुरुवार-अधव्याड्यात एका सत्संगीकडून मधुसुदनदास यांना फक्त एक प्रश्न.
 * meeting_date = त्या सत्संगाचा गुरुवार.
 */
export async function countMadhusudanAsksForWeek(opts: {
  seeker_phone: string;
  meeting_date: string;
}): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM ajapa_questions
      WHERE seeker_phone = ?
        AND meeting_date = ?
        AND status IN ('escalated', 'guru_answered')`,
    args: [opts.seeker_phone, opts.meeting_date],
  });
  return num(rs.rows[0]?.c, 0);
}

export async function hasMadhusudanAskThisWeek(opts: {
  seeker_phone: string;
  meeting_date: string;
}): Promise<boolean> {
  return (await countMadhusudanAsksForWeek(opts)) > 0;
}

/**
 * मागील गुरुवारांच्या व्हॉइस नोट सर्वरवरून काढा (पुढील गुरुवारानंतर राहत नाहीत).
 * भविष्यात Google Drive — सध्या फक्त सर्वर purge.
 */
export async function purgeExpiredAjapaVoiceNotes(
  currentThursdayYmd: string,
): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM ajapa_questions
      WHERE meeting_date IS NOT NULL
        AND meeting_date < ?
        AND (guru_answer_audio_url IS NOT NULL OR guru_answer_audio_media_id IS NOT NULL)`,
    args: [currentThursdayYmd],
  });
  const n = num(rs.rows[0]?.c, 0);
  if (n === 0) return 0;
  await db.execute({
    sql: `UPDATE ajapa_questions
      SET guru_answer_audio_url = NULL,
          guru_answer_audio_media_id = NULL,
          updated_at = ?
      WHERE meeting_date IS NOT NULL
        AND meeting_date < ?
        AND (guru_answer_audio_url IS NOT NULL OR guru_answer_audio_media_id IS NOT NULL)`,
    args: [nowIso(), currentThursdayYmd],
  });
  return n;
}

export async function latestEscalatedForSeeker(
  seekerPhone: string,
): Promise<AjapaQuestion | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM ajapa_questions
      WHERE seeker_phone = ? AND status = 'escalated'
      ORDER BY escalated_at DESC, id DESC
      LIMIT 1`,
    args: [seekerPhone],
  });
  return rs.rows[0] ? asAjapa(rs.rows[0]) : undefined;
}

export async function saveGuruTextAnswer(
  id: number,
  text: string,
): Promise<AjapaQuestion | undefined> {
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ajapa_questions
      SET status = 'guru_answered', guru_answer_text = ?, answered_at = ?, updated_at = ?
      WHERE id = ?`,
    args: [text.trim(), now, now, id],
  });
  return getAjapaQuestion(id);
}

export async function saveGuruVoiceAnswer(
  id: number,
  opts: { mediaId: string; url: string | null },
): Promise<AjapaQuestion | undefined> {
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ajapa_questions
      SET status = 'guru_answered',
          guru_answer_audio_media_id = ?,
          guru_answer_audio_url = ?,
          answered_at = ?,
          updated_at = ?
      WHERE id = ?`,
    args: [opts.mediaId, opts.url, now, now, id],
  });
  return getAjapaQuestion(id);
}

/** In-app संवादक उत्तर — text and/or voice (data URL). */
export async function saveGuruInAppAnswer(
  id: number,
  opts: {
    text?: string | null;
    audioUrl?: string | null;
    audioMediaId?: string | null;
  },
): Promise<AjapaQuestion | undefined> {
  const text = opts.text?.trim() || null;
  const audioUrl = opts.audioUrl || null;
  const audioMediaId = opts.audioMediaId || null;
  if (!text && !audioUrl && !audioMediaId) return undefined;

  const now = nowIso();
  const db = await getDb();
  const existing = await getAjapaQuestion(id);
  if (!existing || existing.status !== "escalated") return undefined;

  await db.execute({
    sql: `UPDATE ajapa_questions
      SET status = 'guru_answered',
          guru_answer_text = COALESCE(?, guru_answer_text),
          guru_answer_audio_url = COALESCE(?, guru_answer_audio_url),
          guru_answer_audio_media_id = COALESCE(?, guru_answer_audio_media_id),
          answered_at = ?,
          updated_at = ?
      WHERE id = ? AND status = 'escalated'`,
    args: [text, audioUrl, audioMediaId, now, now, id],
  });
  return getAjapaQuestion(id);
}

export async function listAjapaQuestions(opts?: {
  status?: AjapaStatus;
  seeker_phone?: string;
  place_id?: number;
  meeting_date?: string;
  /** ISO timestamp — only rows with updated_at > since (incremental sync). */
  since?: string;
  limit?: number;
}): Promise<AjapaQuestion[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.status) {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  if (opts?.seeker_phone) {
    clauses.push("seeker_phone = ?");
    params.push(opts.seeker_phone);
  }
  if (opts?.place_id) {
    clauses.push("place_id = ?");
    params.push(opts.place_id);
  }
  if (opts?.meeting_date) {
    clauses.push("meeting_date = ?");
    params.push(opts.meeting_date);
  }
  if (opts?.since) {
    clauses.push("updated_at > ?");
    params.push(opts.since);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  params.push(limit);
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM ajapa_questions ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`,
    args: params,
  });
  return rs.rows.map(asAjapa);
}
