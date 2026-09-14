import fs from "fs";
import path from "path";
import { createClient, type Client, type Row } from "@libsql/client";
import { DEFAULT_MEETING_TIME } from "./dates";

const DB_PATH = path.join(process.cwd(), "data", "satsang.db");

const SEED_PLACES = [
  "श्री क्षेत्र रानअंत्री",
  "वरखेड",
  "बरटाळा",
  "अंबाशी",
  "नाशिक",
];

type GlobalDb = {
  satsangClient?: Client;
  satsangMigrate?: Promise<void>;
};

export type Place = {
  id: number;
  name: string;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
};

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
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkin_accuracy_m: number | null;
  checkin_distance_m: number | null;
  checkin_ok: boolean | null;
  checkin_phone: string | null;
  checkin_at: string | null;
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

function topicKind(value: unknown): Meeting["topic_kind"] {
  return value === "atmaprabha" || value === "upadesh" ? value : null;
}

function answeredBy(value: unknown): Question["answered_by"] {
  return value === "atmaprabha" || value === "madhusudandas" ? value : null;
}

function asPlace(row: Row): Place {
  return {
    id: num(row.id),
    name: str(row.name),
    sort_order: num(row.sort_order),
    latitude: row.latitude == null ? null : num(row.latitude),
    longitude: row.longitude == null ? null : num(row.longitude),
  };
}

function asMeeting(row: Row): Meeting {
  return {
    id: num(row.id),
    place_id: num(row.place_id),
    meeting_date: str(row.meeting_date),
    meeting_time: str(row.meeting_time),
    men: num(row.men),
    women: num(row.women),
    children: num(row.children),
    topic_kind: topicKind(row.topic_kind),
    topic_title: strOrNull(row.topic_title),
    conductor: strOrNull(row.conductor),
    notes: strOrNull(row.notes),
    checkin_lat: row.checkin_lat == null ? null : num(row.checkin_lat),
    checkin_lng: row.checkin_lng == null ? null : num(row.checkin_lng),
    checkin_accuracy_m: row.checkin_accuracy_m == null ? null : num(row.checkin_accuracy_m),
    checkin_distance_m: row.checkin_distance_m == null ? null : num(row.checkin_distance_m),
    checkin_ok: row.checkin_ok == null ? null : num(row.checkin_ok) === 1,
    checkin_phone: strOrNull(row.checkin_phone),
    checkin_at: strOrNull(row.checkin_at),
    updated_at: str(row.updated_at),
  };
}

function asMeetingWithPlace(row: Row): MeetingWithPlace {
  return { ...asMeeting(row), place_name: str(row.place_name) };
}

function asQuestion(row: Row): Question {
  return {
    id: num(row.id),
    meeting_id: row.meeting_id == null ? null : num(row.meeting_id),
    place_id: row.place_id == null ? null : num(row.place_id),
    question: str(row.question),
    answer: strOrNull(row.answer),
    answered_by: answeredBy(row.answered_by),
    asked_on: str(row.asked_on),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

function asQuestionWithPlace(row: Row): QuestionWithPlace {
  return { ...asQuestion(row), place_name: strOrNull(row.place_name) };
}

function remoteUrl(): string | undefined {
  return process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || undefined;
}

function createDbClient(): Client {
  const url = remoteUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) {
    return createClient({ url, authToken });
  }
  if (process.env.VERCEL) {
    throw new Error(
      "SQLite files do not persist on Vercel. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (Turso) in project environment variables.",
    );
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const fileUrl = `file:${DB_PATH.split(path.sep).join("/")}`;
  return createClient({ url: fileUrl });
}


async function ensureColumn(db: Client, table: string, column: string, typeSql: string) {
  const cols = await db.execute(`PRAGMA table_info(${table})`);
  if (!cols.rows.some((c) => c.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
  }
}

async function migrate(db: Client) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS meetings (
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
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER REFERENCES meetings(id),
      place_id INTEGER REFERENCES places(id),
      question TEXT NOT NULL,
      answer TEXT,
      answered_by TEXT CHECK (answered_by IN ('atmaprabha', 'madhusudandas') OR answered_by IS NULL),
      asked_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_place ON questions(place_id)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at)`,
    `CREATE TABLE IF NOT EXISTS ajapa_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seeker_phone TEXT NOT NULL,
      seeker_name TEXT,
      question TEXT NOT NULL,
      ai_answer TEXT,
      status TEXT NOT NULL CHECK (status IN ('ai_answered', 'escalated', 'guru_answered')),
      guru_answer_text TEXT,
      guru_answer_audio_url TEXT,
      guru_answer_audio_media_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      escalated_at TEXT,
      answered_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ajapa_seeker ON ajapa_questions(seeker_phone)`,
    `CREATE INDEX IF NOT EXISTS idx_ajapa_status ON ajapa_questions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ajapa_created ON ajapa_questions(created_at)`,
    `CREATE TABLE IF NOT EXISTS wa_sessions (
      phone TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'idle',
      ajapa_question_id INTEGER,
      last_inbound_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS place_duties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      charansevak_phone TEXT NOT NULL,
      charansevak_name TEXT,
      assigned_by_phone TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_place_duties_date ON place_duties(meeting_date)`,
    `CREATE INDEX IF NOT EXISTS idx_place_duties_phone ON place_duties(charansevak_phone)`,
    `CREATE TABLE IF NOT EXISTS satsangi_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      appointed_by_phone TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_satsangi_phone ON satsangi_members(phone)`,
    `CREATE TABLE IF NOT EXISTS attendance_people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      phone TEXT NOT NULL,
      name TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      opinion TEXT,
      checked_in_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date, phone)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_people_date ON attendance_people(meeting_date)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_people_place ON attendance_people(place_id, meeting_date)`,
    `CREATE TABLE IF NOT EXISTS join_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      place_id INTEGER NOT NULL REFERENCES places(id),
      meeting_date TEXT NOT NULL,
      created_by_phone TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_join_links_token ON join_links(token)`,
  ];
  for (const sql of statements) {
    await db.execute(sql);
  }

  const cols = await db.execute("PRAGMA table_info(questions)");
  if (!cols.rows.some((c) => c.name === "asked_on")) {
    await db.execute("ALTER TABLE questions ADD COLUMN asked_on TEXT");
    await db.execute(
      "UPDATE questions SET asked_on = substr(created_at, 1, 10) WHERE asked_on IS NULL",
    );
  }
  await db.execute("CREATE INDEX IF NOT EXISTS idx_questions_asked_on ON questions(asked_on)");

  await ensureColumn(db, "places", "latitude", "REAL");
  await ensureColumn(db, "places", "longitude", "REAL");
  await ensureColumn(db, "meetings", "checkin_lat", "REAL");
  await ensureColumn(db, "meetings", "checkin_lng", "REAL");
  await ensureColumn(db, "meetings", "checkin_accuracy_m", "REAL");
  await ensureColumn(db, "meetings", "checkin_distance_m", "REAL");
  await ensureColumn(db, "meetings", "checkin_ok", "INTEGER");
  await ensureColumn(db, "meetings", "checkin_phone", "TEXT");
  await ensureColumn(db, "meetings", "checkin_at", "TEXT");


  const insert = SEED_PLACES.map((name, i) => ({
    sql: "INSERT OR IGNORE INTO places (name, sort_order) VALUES (?, ?)",
    args: [name, i + 1] as (string | number)[],
  }));
  await db.batch(insert, "write");
}

export async function getDb(): Promise<Client> {
  const g = globalThis as typeof globalThis & GlobalDb;
  if (!g.satsangClient) {
    g.satsangClient = createDbClient();
  }
  if (!g.satsangMigrate) {
    g.satsangMigrate = migrate(g.satsangClient);
  }
  await g.satsangMigrate;
  return g.satsangClient;
}

export async function pingDb(): Promise<{ ok: true; store: "turso" | "file" }> {
  const db = await getDb();
  await db.execute("SELECT 1 AS ok");
  return { ok: true, store: remoteUrl() ? "turso" : "file" };
}

export async function listPlaces(): Promise<Place[]> {
  const db = await getDb();
  const rs = await db.execute("SELECT id, name, sort_order, latitude, longitude FROM places ORDER BY sort_order, id");
  return rs.rows.map(asPlace);
}

export async function getPlace(id: number): Promise<Place | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, name, sort_order, latitude, longitude FROM places WHERE id = ?",
    args: [id],
  });
  return rs.rows[0] ? asPlace(rs.rows[0]) : undefined;
}

function nowIso() {
  return new Date().toISOString();
}

export async function getMeeting(placeId: number, date: string): Promise<Meeting | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM meetings WHERE place_id = ? AND meeting_date = ?",
    args: [placeId, date],
  });
  return rs.rows[0] ? asMeeting(rs.rows[0]) : undefined;
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
  checkin_lat?: number | null;
  checkin_lng?: number | null;
  checkin_accuracy_m?: number | null;
  checkin_distance_m?: number | null;
  checkin_ok?: boolean | null;
  checkin_phone?: string | null;
  checkin_at?: string | null;
};

export async function upsertMeeting(patch: MeetingPatch): Promise<Meeting> {
  const existing = await getMeeting(patch.place_id, patch.meeting_date);
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
    checkin_lat:
      patch.checkin_lat !== undefined ? patch.checkin_lat : (existing?.checkin_lat ?? null),
    checkin_lng:
      patch.checkin_lng !== undefined ? patch.checkin_lng : (existing?.checkin_lng ?? null),
    checkin_accuracy_m:
      patch.checkin_accuracy_m !== undefined
        ? patch.checkin_accuracy_m
        : (existing?.checkin_accuracy_m ?? null),
    checkin_distance_m:
      patch.checkin_distance_m !== undefined
        ? patch.checkin_distance_m
        : (existing?.checkin_distance_m ?? null),
    checkin_ok:
      patch.checkin_ok !== undefined ? patch.checkin_ok : (existing?.checkin_ok ?? null),
    checkin_phone:
      patch.checkin_phone !== undefined
        ? patch.checkin_phone
        : (existing?.checkin_phone ?? null),
    checkin_at:
      patch.checkin_at !== undefined ? patch.checkin_at : (existing?.checkin_at ?? null),
    updated_at: nowIso(),
  };

  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO meetings (
        place_id, meeting_date, meeting_time, men, women, children,
        topic_kind, topic_title, conductor, notes,
        checkin_lat, checkin_lng, checkin_accuracy_m, checkin_distance_m,
        checkin_ok, checkin_phone, checkin_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(place_id, meeting_date) DO UPDATE SET
        meeting_time = excluded.meeting_time,
        men = excluded.men,
        women = excluded.women,
        children = excluded.children,
        topic_kind = excluded.topic_kind,
        topic_title = excluded.topic_title,
        conductor = excluded.conductor,
        notes = excluded.notes,
        checkin_lat = excluded.checkin_lat,
        checkin_lng = excluded.checkin_lng,
        checkin_accuracy_m = excluded.checkin_accuracy_m,
        checkin_distance_m = excluded.checkin_distance_m,
        checkin_ok = excluded.checkin_ok,
        checkin_phone = excluded.checkin_phone,
        checkin_at = excluded.checkin_at,
        updated_at = excluded.updated_at`,
    args: [
      merged.place_id,
      merged.meeting_date,
      merged.meeting_time,
      merged.men,
      merged.women,
      merged.children,
      merged.topic_kind,
      merged.topic_title,
      merged.conductor,
      merged.notes,
      merged.checkin_lat,
      merged.checkin_lng,
      merged.checkin_accuracy_m,
      merged.checkin_distance_m,
      merged.checkin_ok == null ? null : merged.checkin_ok ? 1 : 0,
      merged.checkin_phone,
      merged.checkin_at,
      merged.updated_at,
    ],
  });

  const saved = await getMeeting(patch.place_id, patch.meeting_date);
  if (!saved) throw new Error("Failed to save meeting");
  return saved;
}

export async function listMeetingsOnDate(date: string): Promise<MeetingWithPlace[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT m.*, p.name AS place_name
       FROM meetings m
       JOIN places p ON p.id = m.place_id
       WHERE m.meeting_date = ?
       ORDER BY p.sort_order`,
    args: [date],
  });
  return rs.rows.map(asMeetingWithPlace);
}

export async function listMeetingsInRange(start: string, end: string): Promise<MeetingWithPlace[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT m.*, p.name AS place_name
       FROM meetings m
       JOIN places p ON p.id = m.place_id
       WHERE m.meeting_date >= ? AND m.meeting_date <= ?
       ORDER BY m.meeting_date, p.sort_order`,
    args: [start, end],
  });
  return rs.rows.map(asMeetingWithPlace);
}

export async function createQuestion(input: {
  question: string;
  place_id?: number | null;
  meeting_id?: number | null;
  asked_on: string;
}): Promise<Question> {
  const now = nowIso();
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO questions (meeting_id, place_id, question, answer, answered_by, asked_on, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)`,
    args: [
      input.meeting_id ?? null,
      input.place_id ?? null,
      input.question.trim(),
      input.asked_on,
      now,
      now,
    ],
  });
  const id = Number(result.lastInsertRowid);
  const saved = await getQuestion(id);
  if (!saved) throw new Error("Failed to save question");
  return saved;
}

export async function getQuestion(id: number): Promise<Question | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM questions WHERE id = ?",
    args: [id],
  });
  return rs.rows[0] ? asQuestion(rs.rows[0]) : undefined;
}

export async function updateQuestion(
  id: number,
  patch: {
    question?: string;
    answer?: string | null;
    answered_by?: "atmaprabha" | "madhusudandas" | null;
    place_id?: number | null;
  },
): Promise<Question | undefined> {
  const existing = await getQuestion(id);
  if (!existing) return undefined;
  const merged = {
    id,
    question: patch.question ?? existing.question,
    answer: patch.answer !== undefined ? patch.answer : existing.answer,
    answered_by: patch.answered_by !== undefined ? patch.answered_by : existing.answered_by,
    place_id: patch.place_id !== undefined ? patch.place_id : existing.place_id,
    updated_at: nowIso(),
  };
  const db = await getDb();
  await db.execute({
    sql: `UPDATE questions
       SET question = ?, answer = ?, answered_by = ?,
           place_id = ?, updated_at = ?
       WHERE id = ?`,
    args: [
      merged.question,
      merged.answer,
      merged.answered_by,
      merged.place_id,
      merged.updated_at,
      merged.id,
    ],
  });
  return getQuestion(id);
}

export async function deleteQuestion(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM questions WHERE id = ?",
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function listQuestions(opts: {
  place_id?: number;
  unanswered?: boolean;
  from?: string;
  to?: string;
}): Promise<QuestionWithPlace[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
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
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT q.*, p.name AS place_name
       FROM questions q
       LEFT JOIN places p ON p.id = q.place_id
       ${where}
       ORDER BY q.created_at DESC, q.id DESC`,
    args: params,
  });
  return rs.rows.map(asQuestionWithPlace);
}


export async function updatePlaceCoords(
  placeId: number,
  latitude: number,
  longitude: number,
): Promise<Place | undefined> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE places SET latitude = ?, longitude = ? WHERE id = ?",
    args: [latitude, longitude, placeId],
  });
  return getPlace(placeId);
}

export function attendanceTotal(m: Pick<Meeting, "men" | "women" | "children">): number {
  return (m.men || 0) + (m.women || 0) + (m.children || 0);
}

export type PlaceDuty = {
  id: number;
  place_id: number;
  meeting_date: string;
  charansevak_phone: string;
  charansevak_name: string | null;
  assigned_by_phone: string | null;
  updated_at: string;
};

export type PlaceDutyWithPlace = PlaceDuty & { place_name: string };

function asPlaceDuty(row: Row): PlaceDuty {
  return {
    id: num(row.id),
    place_id: num(row.place_id),
    meeting_date: str(row.meeting_date),
    charansevak_phone: str(row.charansevak_phone),
    charansevak_name: strOrNull(row.charansevak_name),
    assigned_by_phone: strOrNull(row.assigned_by_phone),
    updated_at: str(row.updated_at),
  };
}

function asPlaceDutyWithPlace(row: Row): PlaceDutyWithPlace {
  return { ...asPlaceDuty(row), place_name: str(row.place_name) };
}

export async function listDutiesOnDate(date: string): Promise<PlaceDutyWithPlace[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT d.*, p.name AS place_name
       FROM place_duties d
       JOIN places p ON p.id = d.place_id
       WHERE d.meeting_date = ?
       ORDER BY p.sort_order`,
    args: [date],
  });
  return rs.rows.map(asPlaceDutyWithPlace);
}

export async function getDuty(
  placeId: number,
  date: string,
): Promise<PlaceDuty | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM place_duties WHERE place_id = ? AND meeting_date = ?",
    args: [placeId, date],
  });
  return rs.rows[0] ? asPlaceDuty(rs.rows[0]) : undefined;
}

export async function upsertDuty(input: {
  place_id: number;
  meeting_date: string;
  charansevak_phone: string;
  charansevak_name?: string | null;
  assigned_by_phone?: string | null;
}): Promise<PlaceDuty> {
  const phone = str(input.charansevak_phone).replace(/\D/g, "");
  if (phone.length < 10) throw new Error("invalid phone");
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO place_duties (
        place_id, meeting_date, charansevak_phone, charansevak_name,
        assigned_by_phone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(place_id, meeting_date) DO UPDATE SET
        charansevak_phone = excluded.charansevak_phone,
        charansevak_name = excluded.charansevak_name,
        assigned_by_phone = excluded.assigned_by_phone,
        updated_at = excluded.updated_at`,
    args: [
      input.place_id,
      input.meeting_date,
      phone.length === 10 ? `91${phone}` : phone,
      input.charansevak_name?.trim() || null,
      input.assigned_by_phone || null,
      now,
    ],
  });
  const saved = await getDuty(input.place_id, input.meeting_date);
  if (!saved) throw new Error("Failed to save duty");
  return saved;
}

export async function clearDuty(placeId: number, date: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM place_duties WHERE place_id = ? AND meeting_date = ?",
    args: [placeId, date],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export type SatsangiMember = {
  id: number;
  phone: string;
  name: string;
  appointed_by_phone: string | null;
  created_at: string;
};

function asSatsangi(row: Row): SatsangiMember {
  return {
    id: num(row.id),
    phone: str(row.phone),
    name: str(row.name),
    appointed_by_phone: strOrNull(row.appointed_by_phone),
    created_at: str(row.created_at),
  };
}

export async function listSatsangiMembers(): Promise<SatsangiMember[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT * FROM satsangi_members ORDER BY name COLLATE NOCASE, id",
  );
  return rs.rows.map(asSatsangi);
}

export async function getSatsangiByPhone(phone: string): Promise<SatsangiMember | undefined> {
  const digits = str(phone).replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM satsangi_members WHERE phone = ?",
    args: [normalized],
  });
  return rs.rows[0] ? asSatsangi(rs.rows[0]) : undefined;
}

export async function upsertSatsangiMember(input: {
  phone: string;
  name: string;
  appointed_by_phone?: string | null;
}): Promise<SatsangiMember> {
  const digits = str(input.phone).replace(/\D/g, "");
  if (digits.length < 10) throw new Error("invalid phone");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const name = input.name.trim();
  if (!name) throw new Error("name required");
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO satsangi_members (phone, name, appointed_by_phone, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        appointed_by_phone = COALESCE(excluded.appointed_by_phone, satsangi_members.appointed_by_phone)`,
    args: [phone, name, input.appointed_by_phone || null, now],
  });
  const saved = await getSatsangiByPhone(phone);
  if (!saved) throw new Error("Failed to save member");
  return saved;
}

export type AttendancePerson = {
  id: number;
  place_id: number;
  meeting_date: string;
  phone: string;
  name: string | null;
  source: string;
  opinion: string | null;
  checked_in_at: string;
};

function asAttendancePerson(row: Row): AttendancePerson {
  return {
    id: num(row.id),
    place_id: num(row.place_id),
    meeting_date: str(row.meeting_date),
    phone: str(row.phone),
    name: strOrNull(row.name),
    source: str(row.source) || "app",
    opinion: strOrNull(row.opinion),
    checked_in_at: str(row.checked_in_at),
  };
}

export async function listAttendancePeople(
  placeId: number,
  date: string,
): Promise<AttendancePerson[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM attendance_people
      WHERE place_id = ? AND meeting_date = ?
      ORDER BY checked_in_at`,
    args: [placeId, date],
  });
  return rs.rows.map(asAttendancePerson);
}

export async function countAttendancePeople(placeId: number, date: string): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM attendance_people
      WHERE place_id = ? AND meeting_date = ?`,
    args: [placeId, date],
  });
  return num(rs.rows[0]?.c);
}

/** Self check-in: one person, one place, one Thursday. Syncs meetings.men to headcount. */
export async function checkInPerson(input: {
  place_id: number;
  meeting_date: string;
  phone: string;
  name?: string | null;
  source?: "app" | "link";
  opinion?: string | null;
}): Promise<{ person: AttendancePerson; total: number; already: boolean }> {
  const digits = str(input.phone).replace(/\D/g, "");
  if (digits.length < 10) throw new Error("invalid phone");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const now = nowIso();
  const db = await getDb();

  const existing = await db.execute({
    sql: `SELECT * FROM attendance_people
      WHERE place_id = ? AND meeting_date = ? AND phone = ?`,
    args: [input.place_id, input.meeting_date, phone],
  });
  if (existing.rows[0]) {
    const total = await countAttendancePeople(input.place_id, input.meeting_date);
    return { person: asAttendancePerson(existing.rows[0]), total, already: true };
  }

  await db.execute({
    sql: `INSERT INTO attendance_people (
        place_id, meeting_date, phone, name, source, opinion, checked_in_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.place_id,
      input.meeting_date,
      phone,
      input.name?.trim() || null,
      input.source || "app",
      input.opinion?.trim() || null,
      now,
    ],
  });

  const total = await countAttendancePeople(input.place_id, input.meeting_date);
  // Auto headcount: store total in men (legacy aggregate field used by reports)
  await upsertMeeting({
    place_id: input.place_id,
    meeting_date: input.meeting_date,
    men: total,
    women: 0,
    children: 0,
    checkin_phone: phone,
    checkin_at: now,
    checkin_ok: true,
  });

  const rows = await db.execute({
    sql: `SELECT * FROM attendance_people
      WHERE place_id = ? AND meeting_date = ? AND phone = ?`,
    args: [input.place_id, input.meeting_date, phone],
  });
  return { person: asAttendancePerson(rows.rows[0]!), total, already: false };
}

export type JoinLink = {
  id: number;
  token: string;
  place_id: number;
  meeting_date: string;
  created_by_phone: string | null;
  created_at: string;
};

function asJoinLink(row: Row): JoinLink {
  return {
    id: num(row.id),
    token: str(row.token),
    place_id: num(row.place_id),
    meeting_date: str(row.meeting_date),
    created_by_phone: strOrNull(row.created_by_phone),
    created_at: str(row.created_at),
  };
}

export async function createJoinLink(input: {
  token: string;
  place_id: number;
  meeting_date: string;
  created_by_phone?: string | null;
}): Promise<JoinLink> {
  const db = await getDb();
  const now = nowIso();
  await db.execute({
    sql: `INSERT INTO join_links (token, place_id, meeting_date, created_by_phone, created_at)
      VALUES (?, ?, ?, ?, ?)`,
    args: [
      input.token,
      input.place_id,
      input.meeting_date,
      input.created_by_phone || null,
      now,
    ],
  });
  const saved = await getJoinLinkByToken(input.token);
  if (!saved) throw new Error("Failed to create join link");
  return saved;
}

export async function getJoinLinkByToken(token: string): Promise<JoinLink | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM join_links WHERE token = ?",
    args: [token],
  });
  return rs.rows[0] ? asJoinLink(rs.rows[0]) : undefined;
}

/** Previous Thursday duty for soft rotate nudge. */
export async function getPreviousDutySamePlace(
  placeId: number,
  beforeDate: string,
): Promise<PlaceDuty | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM place_duties
      WHERE place_id = ? AND meeting_date < ?
      ORDER BY meeting_date DESC LIMIT 1`,
    args: [placeId, beforeDate],
  });
  return rs.rows[0] ? asPlaceDuty(rs.rows[0]) : undefined;
}

