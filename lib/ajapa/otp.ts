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
    created_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ajapa_otps_q ON ajapa_otps(question_id, phone)`,
  );
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createEscalateOtp(opts: {
  questionId: number;
  phone: string;
  ttlMinutes?: number;
}): Promise<{ code: string; expires_at: string }> {
  await ensureOtpTable();
  const phone = normalizePhone(opts.phone);
  const code = generateOtpCode();
  const ttl = opts.ttlMinutes ?? 10;
  const expires = new Date(Date.now() + ttl * 60 * 1000).toISOString();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ajapa_otps SET used_at = ? WHERE question_id = ? AND phone = ? AND used_at IS NULL`,
    args: [nowIso(), opts.questionId, phone],
  });
  await db.execute({
    sql: `INSERT INTO ajapa_otps (question_id, phone, code, purpose, expires_at, created_at)
      VALUES (?, ?, ?, 'escalate', ?, ?)`,
    args: [opts.questionId, phone, code, expires, nowIso()],
  });
  return { code, expires_at: expires };
}

export async function verifyEscalateOtp(opts: {
  questionId: number;
  phone: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOtpTable();
  const phone = normalizePhone(opts.phone);
  const code = String(opts.code || "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "६ अंकी OTP टाका" };

  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM ajapa_otps
      WHERE question_id = ? AND phone = ? AND code = ? AND used_at IS NULL
      ORDER BY id DESC LIMIT 1`,
    args: [opts.questionId, phone, code],
  });
  const row = rs.rows[0];
  if (!row) return { ok: false, error: "OTP चुकीचा" };
  const expires = String(row.expires_at || "");
  if (expires && new Date(expires).getTime() < Date.now()) {
    return { ok: false, error: "OTP कालबाह्य — पुन्हा मागा" };
  }
  await db.execute({
    sql: `UPDATE ajapa_otps SET used_at = ? WHERE id = ?`,
    args: [nowIso(), num(row.id)],
  });
  return { ok: true };
}
