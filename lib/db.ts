import fs from "fs";
import path from "path";
import { createClient, type Client, type Row } from "@libsql/client";
import { DEFAULT_MEETING_TIME, addDaysYmd, shouldAutoContinueVahak } from "./dates";
import { phonesEqual } from "./offline/phone";
import { renameAmbashiToShindi } from "./place-rename";
import { ensurePlaceDutiesDutyKind } from "./place-duties-migrate";
import {
  DUTY_KIND_VAHAK,
  asDutyKind,
  type PlaceDutyKind,
} from "./duty-kind";
import {
  productionFileStoreBlockedReason,
  remoteDatabaseUrl,
} from "./runtime";
import { sniffImageMime, type EventInput, type PhotoInput, type PhotoMeta } from "./events";

const DB_PATH = path.join(process.cwd(), "data", "satsang.db");

const SEED_PLACES = [
  "श्री क्षेत्र रानअंत्री",
  "वरखेड",
  "बरटाळा",
  "शिंदी",
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
  asked_by_phone: string | null;
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
    asked_by_phone: strOrNull(row.asked_by_phone),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

function asQuestionWithPlace(row: Row): QuestionWithPlace {
  return { ...asQuestion(row), place_name: strOrNull(row.place_name) };
}

function remoteUrl(): string | undefined {
  return remoteDatabaseUrl();
}

function createDbClient(): Client {
  const url = remoteUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) {
    return createClient({ url, authToken });
  }
  const blocked = productionFileStoreBlockedReason();
  if (blocked) {
    throw new Error(blocked);
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
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      place_code TEXT NOT NULL,
      login_code TEXT NOT NULL UNIQUE,
      login_code_collision INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_members_place ON members(place_code)`,
    `CREATE INDEX IF NOT EXISTS idx_members_collision ON members(login_code_collision)`,
    `CREATE TABLE IF NOT EXISTS weekly_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      question TEXT NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS weekly_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_question_id INTEGER NOT NULL REFERENCES weekly_questions(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      answer TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (weekly_question_id, member_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_weekly_answers_member ON weekly_answers(member_id)`,
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
      duty_kind TEXT NOT NULL DEFAULT 'vahak' CHECK (duty_kind IN ('vahak', 'satsang_charansevak')),
      charansevak_phone TEXT NOT NULL,
      charansevak_name TEXT,
      assigned_by_phone TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (place_id, meeting_date, duty_kind)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_place_duties_date ON place_duties(meeting_date)`,
    `CREATE INDEX IF NOT EXISTS idx_place_duties_phone ON place_duties(charansevak_phone)`,
    `CREATE INDEX IF NOT EXISTS idx_place_duties_kind ON place_duties(duty_kind)`,
    // Table name kept for migrations; rows are appointed परमानंद चरणसेवक.
    `CREATE TABLE IF NOT EXISTS satsangi_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      appointed_by_phone TEXT,
      home_place_id INTEGER,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_satsangi_phone ON satsangi_members(phone)`,
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT,
      location TEXT,
      description TEXT,
      created_by_phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)`,
    `CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      caption TEXT,
      taken_on TEXT,
      event_id INTEGER REFERENCES events(id),
      created_by_phone TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_photos_taken ON photos(taken_on)`,
  ];
  for (const sql of statements) {
    await db.execute(sql);
  }

  await ensurePlaceDutiesDutyKind(db);

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
  await ensureColumn(db, "satsangi_members", "home_place_id", "INTEGER");
  await ensureColumn(db, "questions", "asked_by_phone", "TEXT");
  await ensureColumn(db, "photos", "image_blob", "BLOB");
  await ensureColumn(db, "photos", "thumb_blob", "BLOB");
  await ensureColumn(db, "photos", "mime", "TEXT");
  await ensureColumn(db, "photos", "width", "INTEGER");
  await ensureColumn(db, "photos", "height", "INTEGER");
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_satsangi_home_place ON satsangi_members(home_place_id)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_questions_asked_by ON questions(asked_by_phone)",
  );

  await renameAmbashiToShindi(db);

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
  asked_by_phone?: string | null;
}): Promise<Question> {
  const now = nowIso();
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO questions (meeting_id, place_id, question, answer, answered_by, asked_on, asked_by_phone, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
    args: [
      input.meeting_id ?? null,
      input.place_id ?? null,
      input.question.trim(),
      input.asked_on,
      input.asked_by_phone ?? null,
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
  asked_by_phone?: string;
}): Promise<QuestionWithPlace[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts.place_id) {
    clauses.push("q.place_id = ?");
    params.push(opts.place_id);
  }
  if (opts.asked_by_phone) {
    clauses.push("q.asked_by_phone = ?");
    params.push(opts.asked_by_phone);
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

export {
  DUTY_KIND_SATSANG,
  DUTY_KIND_VAHAK,
  asDutyKind,
  type PlaceDutyKind,
} from "./duty-kind";

export type PlaceDuty = {
  id: number;
  place_id: number;
  meeting_date: string;
  duty_kind: PlaceDutyKind;
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
    duty_kind: asDutyKind(row.duty_kind) ?? DUTY_KIND_VAHAK,
    charansevak_phone: str(row.charansevak_phone),
    charansevak_name: strOrNull(row.charansevak_name),
    assigned_by_phone: strOrNull(row.assigned_by_phone),
    updated_at: str(row.updated_at),
  };
}

function asPlaceDutyWithPlace(row: Row): PlaceDutyWithPlace {
  return { ...asPlaceDuty(row), place_name: str(row.place_name) };
}

export async function listDutiesForPhone(
  phone: string,
  date: string,
  kind: PlaceDutyKind = DUTY_KIND_VAHAK,
): Promise<PlaceDutyWithPlace[]> {
  const all = await listDutiesOnDate(date, kind);
  return all.filter((d) => phonesEqual(phone, d.charansevak_phone));
}

async function listDutiesOnDateRaw(
  date: string,
  kind: PlaceDutyKind = DUTY_KIND_VAHAK,
): Promise<PlaceDutyWithPlace[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT d.*, p.name AS place_name
       FROM place_duties d
       JOIN places p ON p.id = d.place_id
       WHERE d.meeting_date = ? AND d.duty_kind = ?
       ORDER BY p.sort_order`,
    args: [date, kind],
  });
  return rs.rows.map(asPlaceDutyWithPlace);
}

/** After Friday noon: if this Thursday has no वाहक, keep last week's person. */
async function continuePreviousVahak(date: string): Promise<void> {
  if (!shouldAutoContinueVahak(date)) return;
  const existing = await listDutiesOnDateRaw(date, DUTY_KIND_VAHAK);
  const taken = new Set(existing.map((d) => d.place_id));
  const prev = await listDutiesOnDateRaw(addDaysYmd(date, -7), DUTY_KIND_VAHAK);
  for (const duty of prev) {
    if (taken.has(duty.place_id)) continue;
    await upsertDuty({
      place_id: duty.place_id,
      meeting_date: date,
      duty_kind: DUTY_KIND_VAHAK,
      charansevak_phone: duty.charansevak_phone,
      charansevak_name: duty.charansevak_name,
      assigned_by_phone: "auto-continue",
    });
  }
}

export async function listDutiesOnDate(
  date: string,
  kind: PlaceDutyKind = DUTY_KIND_VAHAK,
): Promise<PlaceDutyWithPlace[]> {
  if (kind === DUTY_KIND_VAHAK) {
    await continuePreviousVahak(date);
  }
  return listDutiesOnDateRaw(date, kind);
}

export async function getDuty(
  placeId: number,
  date: string,
  kind: PlaceDutyKind = DUTY_KIND_VAHAK,
): Promise<PlaceDuty | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM place_duties WHERE place_id = ? AND meeting_date = ? AND duty_kind = ?",
    args: [placeId, date, kind],
  });
  return rs.rows[0] ? asPlaceDuty(rs.rows[0]) : undefined;
}

export async function upsertDuty(input: {
  place_id: number;
  meeting_date: string;
  duty_kind?: PlaceDutyKind;
  charansevak_phone: string;
  charansevak_name?: string | null;
  assigned_by_phone?: string | null;
}): Promise<PlaceDuty> {
  const phone = str(input.charansevak_phone).replace(/\D/g, "");
  if (phone.length < 10) throw new Error("invalid phone");
  const kind = input.duty_kind ?? DUTY_KIND_VAHAK;
  const now = nowIso();
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO place_duties (
        place_id, meeting_date, duty_kind, charansevak_phone, charansevak_name,
        assigned_by_phone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(place_id, meeting_date, duty_kind) DO UPDATE SET
        charansevak_phone = excluded.charansevak_phone,
        charansevak_name = excluded.charansevak_name,
        assigned_by_phone = excluded.assigned_by_phone,
        updated_at = excluded.updated_at`,
    args: [
      input.place_id,
      input.meeting_date,
      kind,
      phone.length === 10 ? `91${phone}` : phone,
      input.charansevak_name?.trim() || null,
      input.assigned_by_phone || null,
      now,
    ],
  });
  const saved = await getDuty(input.place_id, input.meeting_date, kind);
  if (!saved) throw new Error("Failed to save duty");
  return saved;
}

export async function clearDuty(
  placeId: number,
  date: string,
  kind: PlaceDutyKind = DUTY_KIND_VAHAK,
): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM place_duties WHERE place_id = ? AND meeting_date = ? AND duty_kind = ?",
    args: [placeId, date, kind],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/** Appointed परमानंद चरणसेवक (table `satsangi_members` kept for migrations). */
export type SatsangiMember = {
  id: number;
  phone: string;
  name: string;
  appointed_by_phone: string | null;
  home_place_id: number | null;
  created_at: string;
};

function asSatsangi(row: Row): SatsangiMember {
  return {
    id: num(row.id),
    phone: str(row.phone),
    name: str(row.name),
    appointed_by_phone: strOrNull(row.appointed_by_phone),
    home_place_id: row.home_place_id == null ? null : num(row.home_place_id),
    created_at: str(row.created_at),
  };
}

function normalizeMemberPhone(phone: string): string {
  const digits = str(phone).replace(/\D/g, "");
  if (digits.length < 10) throw new Error("invalid phone");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function listSatsangiMembers(): Promise<SatsangiMember[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT * FROM satsangi_members ORDER BY name COLLATE NOCASE, id",
  );
  return rs.rows.map(asSatsangi);
}

export async function getSatsangiByPhone(
  phone: string,
): Promise<SatsangiMember | undefined> {
  const normalized = normalizeMemberPhone(phone);
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
  home_place_id?: number | null;
}): Promise<SatsangiMember> {
  const phone = normalizeMemberPhone(input.phone);
  const name = input.name.trim();
  if (!name) throw new Error("name required");
  const now = nowIso();
  const homePlaceId =
    input.home_place_id != null && Number.isFinite(Number(input.home_place_id))
      ? Number(input.home_place_id)
      : null;
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO satsangi_members (phone, name, appointed_by_phone, home_place_id, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        appointed_by_phone = COALESCE(excluded.appointed_by_phone, satsangi_members.appointed_by_phone),
        home_place_id = COALESCE(excluded.home_place_id, satsangi_members.home_place_id)`,
    args: [phone, name, input.appointed_by_phone || null, homePlaceId, now],
  });
  const saved = await getSatsangiByPhone(phone);
  if (!saved) throw new Error("Failed to save member");
  return saved;
}

export type SatsangEvent = {
  id: number;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  created_by_phone: string | null;
  created_at: string;
};

export type Photo = {
  id: number;
  image_url: string;
  thumb_url: string;
  /** True when bytes live in `image_blob` (served by /api/photos/[id]/image). */
  uploaded: boolean;
  width: number | null;
  height: number | null;
  caption: string | null;
  taken_on: string | null;
  event_id: number | null;
  created_by_phone: string | null;
  created_at: string;
};

export type PhotoWithEvent = Photo & { event_title: string | null };

/** Never `ph.*` — blobs must not ride along with list queries. */
const PHOTO_SELECT = `SELECT ph.id, ph.image_url, ph.caption, ph.taken_on, ph.event_id,
       ph.created_by_phone, ph.created_at, ph.mime, ph.width, ph.height,
       (ph.thumb_blob IS NOT NULL) AS has_thumb, e.title AS event_title
       FROM photos ph
       LEFT JOIN events e ON e.id = ph.event_id`;

function asEvent(row: Row): SatsangEvent {
  return {
    id: num(row.id),
    title: str(row.title),
    event_date: str(row.event_date),
    event_time: strOrNull(row.event_time),
    location: strOrNull(row.location),
    description: strOrNull(row.description),
    created_by_phone: strOrNull(row.created_by_phone),
    created_at: str(row.created_at),
  };
}

function asPhotoWithEvent(row: Row): PhotoWithEvent {
  const uploaded = row.mime != null;
  const image_url = str(row.image_url);
  return {
    id: num(row.id),
    image_url,
    thumb_url: uploaded && num(row.has_thumb) === 1 ? `${image_url}?size=thumb` : image_url,
    uploaded,
    width: row.width == null ? null : num(row.width),
    height: row.height == null ? null : num(row.height),
    caption: strOrNull(row.caption),
    taken_on: strOrNull(row.taken_on),
    event_id: row.event_id == null ? null : num(row.event_id),
    created_by_phone: strOrNull(row.created_by_phone),
    created_at: str(row.created_at),
    event_title: strOrNull(row.event_title),
  };
}

export async function listEvents(): Promise<SatsangEvent[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT * FROM events ORDER BY event_date DESC, event_time DESC, id DESC",
  );
  return rs.rows.map(asEvent);
}

export async function getEvent(id: number): Promise<SatsangEvent | undefined> {
  const db = await getDb();
  const rs = await db.execute({ sql: "SELECT * FROM events WHERE id = ?", args: [id] });
  return rs.rows[0] ? asEvent(rs.rows[0]) : undefined;
}

export async function createEvent(
  input: EventInput & { created_by_phone?: string | null },
): Promise<SatsangEvent> {
  const now = nowIso();
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO events (title, event_date, event_time, location, description, created_by_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.title,
      input.event_date,
      input.event_time,
      input.location,
      input.description,
      input.created_by_phone ?? null,
      now,
      now,
    ],
  });
  const saved = await getEvent(Number(result.lastInsertRowid));
  if (!saved) throw new Error("Failed to save event");
  return saved;
}

export async function deleteEvent(id: number): Promise<boolean> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE photos SET event_id = NULL WHERE event_id = ?", args: [id] });
  const result = await db.execute({ sql: "DELETE FROM events WHERE id = ?", args: [id] });
  return (result.rowsAffected ?? 0) > 0;
}

export async function listPhotos(): Promise<PhotoWithEvent[]> {
  const db = await getDb();
  const rs = await db.execute(
    `${PHOTO_SELECT}
       ORDER BY COALESCE(ph.taken_on, substr(ph.created_at, 1, 10)) DESC, ph.id DESC`,
  );
  return rs.rows.map(asPhotoWithEvent);
}

export async function getPhoto(id: number): Promise<PhotoWithEvent | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `${PHOTO_SELECT} WHERE ph.id = ?`,
    args: [id],
  });
  return rs.rows[0] ? asPhotoWithEvent(rs.rows[0]) : undefined;
}

export async function createPhoto(
  input: PhotoInput & { created_by_phone?: string | null },
): Promise<PhotoWithEvent> {
  if (input.event_id != null && !(await getEvent(input.event_id))) {
    throw new Error("कार्यक्रम सापडला नाही");
  }
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO photos (image_url, caption, taken_on, event_id, created_by_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.image_url,
      input.caption,
      input.taken_on,
      input.event_id,
      input.created_by_phone ?? null,
      nowIso(),
    ],
  });
  const saved = await getPhoto(Number(result.lastInsertRowid));
  if (!saved) throw new Error("Failed to save photo");
  return saved;
}

export async function createUploadedPhoto(
  input: PhotoMeta & {
    image: Uint8Array;
    thumb: Uint8Array | null;
    mime: string;
    width: number | null;
    height: number | null;
    created_by_phone?: string | null;
  },
): Promise<PhotoWithEvent> {
  if (input.event_id != null && !(await getEvent(input.event_id))) {
    throw new Error("कार्यक्रम सापडला नाही");
  }
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO photos (
        image_url, caption, taken_on, event_id, created_by_phone, created_at,
        image_blob, thumb_blob, mime, width, height
      ) VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.caption,
      input.taken_on,
      input.event_id,
      input.created_by_phone ?? null,
      nowIso(),
      input.image,
      input.thumb,
      input.mime,
      input.width,
      input.height,
    ],
  });
  const id = Number(result.lastInsertRowid);
  await db.execute({
    sql: "UPDATE photos SET image_url = ? WHERE id = ?",
    args: [`/api/photos/${id}/image`, id],
  });
  const saved = await getPhoto(id);
  if (!saved) throw new Error("Failed to save photo");
  return saved;
}

function asBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(Buffer.from(String(value), "base64"));
}

export async function getPhotoImage(
  id: number,
  size: "full" | "thumb",
): Promise<{ bytes: Uint8Array; mime: string } | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT image_blob, thumb_blob, mime FROM photos WHERE id = ?",
    args: [id],
  });
  const row = rs.rows[0];
  if (!row || row.mime == null) return undefined;
  const raw = size === "thumb" && row.thumb_blob != null ? row.thumb_blob : row.image_blob;
  if (raw == null) return undefined;
  const bytes = asBytes(raw);
  return { bytes, mime: sniffImageMime(bytes) ?? str(row.mime) };
}

export async function deletePhoto(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({ sql: "DELETE FROM photos WHERE id = ?", args: [id] });
  return (result.rowsAffected ?? 0) > 0;
}
