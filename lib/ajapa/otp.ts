import { randomInt } from "crypto";
import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/ajapa/phone";

function nowIso() {
  return new Date().toISOString();
}

function num(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureOtpTable() {
  const db = await getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS ajapa_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'escalate',
    expires_at TEXT NOT NULL,
    used_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ajapa_otps_q ON ajapa_otps(question_id, phone)`,
  );
  // Older DBs may lack attempts column
  try {
    await db.execute(`ALTER TABLE ajapa_otps ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // column exists
  }
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Never expose OTP codes in production / Vercel. */
export function allowDebugOtp(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL) return false;
  if (env.NODE_ENV === "production") return false;
  return (
    env.WHATSAPP_DRY_RUN === "1" ||
    env.WHATSAPP_DRY_RUN === "true" ||
    env.ALLOW_DEBUG_OTP === "1"
  );
}

export async function createOtp(opts: {
  questionId: number;
  phone: string;
  purpose?: string;
  ttlMinutes?: number;
}): Promise<{ code: string; expires_at: string }> {
  await ensureOtpTable();
  const phone = normalizePhone(opts.phone);
  const purpose = opts.purpose || "escalate";
  const code = generateOtpCode();
  const ttl = opts.ttlMinutes ?? 10;
  const expires = new Date(Date.now() + ttl * 60 * 1000).toISOString();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ajapa_otps SET used_at = ? WHERE question_id = ? AND phone = ? AND purpose = ? AND used_at IS NULL`,
    args: [nowIso(), opts.questionId, phone, purpose],
  });
  await db.execute({
    sql: `INSERT INTO ajapa_otps (question_id, phone, code, purpose, expires_at, attempts, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)`,
    args: [opts.questionId, phone, code, purpose, expires, nowIso()],
  });
  return { code, expires_at: expires };
}

export async function createEscalateOtp(opts: {
  questionId: number;
  phone: string;
  ttlMinutes?: number;
}): Promise<{ code: string; expires_at: string }> {
  return createOtp({ ...opts, purpose: "escalate" });
}

export async function createActorBindOtp(opts: {
  phone: string;
  ttlMinutes?: number;
}): Promise<{ code: string; expires_at: string }> {
  // question_id 0 = actor bind (no ajapa question)
  return createOtp({
    questionId: 0,
    phone: opts.phone,
    purpose: "actor_bind",
    ttlMinutes: opts.ttlMinutes ?? 10,
  });
}

export async function verifyOtp(opts: {
  questionId: number;
  phone: string;
  code: string;
  purpose?: string;
  maxAttempts?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOtpTable();
  const phone = normalizePhone(opts.phone);
  const purpose = opts.purpose || "escalate";
  const code = String(opts.code || "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "६ अंकी OTP टाका" };
  const maxAttempts = opts.maxAttempts ?? 5;

  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM ajapa_otps
      WHERE question_id = ? AND phone = ? AND purpose = ? AND used_at IS NULL
      ORDER BY id DESC LIMIT 1`,
    args: [opts.questionId, phone, purpose],
  });
  const row = rs.rows[0];
  if (!row) return { ok: false, error: "OTP चुकीचा किंवा कालबाह्य" };

  const attempts = num(row.attempts);
  if (attempts >= maxAttempts) {
    await db.execute({
      sql: `UPDATE ajapa_otps SET used_at = ? WHERE id = ?`,
      args: [nowIso(), num(row.id)],
    });
    return { ok: false, error: "OTP प्रयत्न संपले — पुन्हा मागा" };
  }

  const expires = String(row.expires_at || "");
  if (expires && new Date(expires).getTime() < Date.now()) {
    return { ok: false, error: "OTP कालबाह्य — पुन्हा मागा" };
  }

  if (String(row.code) !== code) {
    await db.execute({
      sql: `UPDATE ajapa_otps SET attempts = attempts + 1 WHERE id = ?`,
      args: [num(row.id)],
    });
    return { ok: false, error: "OTP चुकीचा" };
  }

  await db.execute({
    sql: `UPDATE ajapa_otps SET used_at = ? WHERE id = ?`,
    args: [nowIso(), num(row.id)],
  });
  return { ok: true };
}

export async function verifyEscalateOtp(opts: {
  questionId: number;
  phone: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return verifyOtp({ ...opts, purpose: "escalate" });
}

export async function verifyActorBindOtp(opts: {
  phone: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return verifyOtp({
    questionId: 0,
    phone: opts.phone,
    code: opts.code,
    purpose: "actor_bind",
  });
}
