import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/ajapa/phone";
import { hashStaffPin, verifyStaffPinHash } from "@/lib/staff-pin";

async function ensureTable() {
  const db = await getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS staff_pins (
    phone TEXT PRIMARY KEY,
    pin_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
}

export async function getStaffPinHash(phoneRaw: string): Promise<string | null> {
  await ensureTable();
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT pin_hash FROM staff_pins WHERE phone = ? LIMIT 1",
    args: [normalizePhone(phoneRaw)],
  });
  const row = rs.rows[0];
  return row ? String(row.pin_hash) : null;
}

export async function setStaffPin(phoneRaw: string, pin: string): Promise<void> {
  await ensureTable();
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO staff_pins (phone, pin_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = excluded.updated_at`,
    args: [normalizePhone(phoneRaw), hashStaffPin(pin), now, now],
  });
}

export async function verifyStaffPin(phoneRaw: string, pin: string): Promise<boolean> {
  const stored = await getStaffPinHash(phoneRaw);
  return verifyStaffPinHash(pin, stored);
}
