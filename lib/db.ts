import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DEFAULT_MEETING_TIME } from "./dates";

const DB_PATH = path.join(process.cwd(), "data", "satsang.db");

const SEED_PLACES = [
  "श्री क्षेत्र रानअंत्री",
  "वरखेड",
  "बरटाळा",
  "अंबाशी",
  "नाशिक",
];

type GlobalDb = { satsangDb?: Database.Database };

export type Place = { id: number; name: string; sort_order: number };

export type Meeting = {
  id: number;
  place_id: number;
  meeting_date: string;
  meeting_time: string;
  men: number;
  women: number;
  children: number;
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
  conductor: string | null;
  notes: string | null;
  updated_at: string;
};

export type Question = {
  id: number;
  meeting_id: number | null;
  place_id: number | null;
  question: string;
  answer: string | null;
  answered_by: "atmaprabha" | "madhusudandas" | null;
  asked_on: string;
  created_at: string;
  updated_at: string;
};

export type MeetingWithPlace = Meeting & { place_name: string };
export type QuestionWithPlace = Question & { place_name: string | null };

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      meeting_time TEXT NOT NULL DEFAULT '${DEFAULT_MEETING_TIME}',
      men INTEGER NOT NULL DEFAULT 0,
      women INTEGER NOT NULL DEFAULT 0,
      children INTEGER NOT NULL DEFAULT 0,
      topic_kind TEXT CHECK (topic_kind IN ('atmaprabha', 'upadesh') OR topic_kind IS NULL),
      topic_title TEXT,
      conductor TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER REFERENCES meetings(id),
      place_id INTEGER REFERENCES places(id),
      question TEXT NOT NULL,
      answer TEXT,
      answered_by TEXT CHECK (answered_by IN ('atmaprabha', 'madhusudandas') OR answered_by IS NULL),
      asked_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
    CREATE INDEX IF NOT EXISTS idx_questions_place ON questions(place_id);
    CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
  `);

  const cols = db.prepare("PRAGMA table_info(questions)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "asked_on")) {
    db.exec("ALTER TABLE questions ADD COLUMN asked_on TEXT");
    db.exec("UPDATE questions SET asked_on = substr(created_at, 1, 10) WHERE asked_on IS NULL");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_questions_asked_on ON questions(asked_on)");

  const count = db.prepare("SELECT COUNT(*) AS n FROM places").get() as { n: number };
  if (count.n === 0) {
    const insert = db.prepare("INSERT INTO places (name, sort_order) VALUES (?, ?)");
    const tx = db.transaction(() => {
      SEED_PLACES.forEach((name, i) => insert.run(name, i + 1));
    });
    tx();
  }
}

export function getDb(): Database.Database {
  const g = globalThis as typeof globalThis & GlobalDb;
  if (!g.satsangDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    g.satsangDb = db;
  }
  return g.satsangDb;
}

export function listPlaces(): Place[] {
  return getDb()
    .prepare("SELECT id, name, sort_order FROM places ORDER BY sort_order, id")
    .all() as Place[];
}

export function getPlace(id: number): Place | undefined {
  return getDb().prepare("SELECT id, name, sort_order FROM places WHERE id = ?").get(id) as
    | Place
    | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

export function getMeeting(placeId: number, date: string): Meeting | undefined {
  return getDb()
    .prepare("SELECT * FROM meetings WHERE place_id = ? AND meeting_date = ?")
    .get(placeId, date) as Meeting | undefined;
}

export type MeetingPatch = {
  place_id: number;
  meeting_date: string;
  meeting_time?: string;
  men?: number;
  women?: number;
  children?: number;
  topic_kind?: "atmaprabha" | "upadesh" | null;
  topic_title?: string | null;
  conductor?: string | null;
  notes?: string | null;
};

export function upsertMeeting(patch: MeetingPatch): Meeting {
  const existing = getMeeting(patch.place_id, patch.meeting_date);
  const merged = {
    place_id: patch.place_id,
    meeting_date: patch.meeting_date,
    meeting_time: patch.meeting_time ?? existing?.meeting_time ?? DEFAULT_MEETING_TIME,
    men: patch.men ?? existing?.men ?? 0,
    women: patch.women ?? existing?.women ?? 0,
    children: patch.children ?? existing?.children ?? 0,
    topic_kind:
      patch.topic_kind !== undefined ? patch.topic_kind : (existing?.topic_kind ?? null),
    topic_title:
      patch.topic_title !== undefined ? patch.topic_title : (existing?.topic_title ?? null),
    conductor:
      patch.conductor !== undefined ? patch.conductor : (existing?.conductor ?? null),
    notes: patch.notes !== undefined ? patch.notes : (existing?.notes ?? null),
    updated_at: nowIso(),
  };

  getDb()
    .prepare(
      `INSERT INTO meetings (
        place_id, meeting_date, meeting_time, men, women, children,
        topic_kind, topic_title, conductor, notes, updated_at
      ) VALUES (
        @place_id, @meeting_date, @meeting_time, @men, @women, @children,
        @topic_kind, @topic_title, @conductor, @notes, @updated_at
      )
      ON CONFLICT(place_id, meeting_date) DO UPDATE SET
        meeting_time = excluded.meeting_time,
        men = excluded.men,
        women = excluded.women,
        children = excluded.children,
        topic_kind = excluded.topic_kind,
        topic_title = excluded.topic_title,
        conductor = excluded.conductor,
        notes = excluded.notes,
        updated_at = excluded.updated_at`,
    )
    .run(merged);

  const saved = getMeeting(patch.place_id, patch.meeting_date);
  if (!saved) throw new Error("Failed to save meeting");
  return saved;
}

export function listMeetingsOnDate(date: string): MeetingWithPlace[] {
  return getDb()
    .prepare(
      `SELECT m.*, p.name AS place_name
       FROM meetings m
       JOIN places p ON p.id = m.place_id
       WHERE m.meeting_date = ?
       ORDER BY p.sort_order`,
    )
    .all(date) as MeetingWithPlace[];
}

export function listMeetingsInRange(start: string, end: string): MeetingWithPlace[] {
  return getDb()
    .prepare(
      `SELECT m.*, p.name AS place_name
       FROM meetings m
       JOIN places p ON p.id = m.place_id
       WHERE m.meeting_date >= ? AND m.meeting_date <= ?
       ORDER BY m.meeting_date, p.sort_order`,
    )
    .all(start, end) as MeetingWithPlace[];
}

export function createQuestion(input: {
  question: string;
  place_id?: number | null;
  meeting_id?: number | null;
  asked_on: string;
}): Question {
  const now = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO questions (meeting_id, place_id, question, answer, answered_by, asked_on, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)`,
    )
    .run(
      input.meeting_id ?? null,
      input.place_id ?? null,
      input.question.trim(),
      input.asked_on,
      now,
      now,
    );
  return getQuestion(Number(result.lastInsertRowid))!;
}

export function getQuestion(id: number): Question | undefined {
  return getDb().prepare("SELECT * FROM questions WHERE id = ?").get(id) as Question | undefined;
}

export function updateQuestion(
  id: number,
  patch: {
    question?: string;
    answer?: string | null;
    answered_by?: "atmaprabha" | "madhusudandas" | null;
    place_id?: number | null;
  },
): Question | undefined {
  const existing = getQuestion(id);
  if (!existing) return undefined;
  const merged = {
    id,
    question: patch.question ?? existing.question,
    answer: patch.answer !== undefined ? patch.answer : existing.answer,
    answered_by: patch.answered_by !== undefined ? patch.answered_by : existing.answered_by,
    place_id: patch.place_id !== undefined ? patch.place_id : existing.place_id,
    updated_at: nowIso(),
  };
  getDb()
    .prepare(
      `UPDATE questions
       SET question = @question, answer = @answer, answered_by = @answered_by,
           place_id = @place_id, updated_at = @updated_at
       WHERE id = @id`,
    )
    .run(merged);
  return getQuestion(id);
}

export function deleteQuestion(id: number): boolean {
  const result = getDb().prepare("DELETE FROM questions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listQuestions(opts: {
  place_id?: number;
  unanswered?: boolean;
  from?: string;
  to?: string;
}): QuestionWithPlace[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.place_id) {
    clauses.push("q.place_id = ?");
    params.push(opts.place_id);
  }
  if (opts.unanswered) {
    clauses.push("(q.answer IS NULL OR trim(q.answer) = '')");
  }
  if (opts.from) {
    clauses.push("q.asked_on >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    clauses.push("q.asked_on <= ?");
    params.push(opts.to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT q.*, p.name AS place_name
       FROM questions q
       LEFT JOIN places p ON p.id = q.place_id
       ${where}
       ORDER BY q.created_at DESC, q.id DESC`,
    )
    .all(...params) as QuestionWithPlace[];
}

export function attendanceTotal(m: Pick<Meeting, "men" | "women" | "children">): number {
  return (m.men || 0) + (m.women || 0) + (m.children || 0);
}
