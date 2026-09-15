import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";

export function whatsappVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

export function whatsappAppSecret(): string {
  return (
    process.env.WHATSAPP_APP_SECRET ||
    process.env.META_APP_SECRET ||
    ""
  );
}

export function isWeakWhatsappVerifyToken(token: string): boolean {
  const t = token.trim();
  return !t || t === "ajapa-verify" || t === "verify-token" || t.length < 16;
}

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = whatsappAppSecret();
  if (!secret) return false;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function ensureDedupTable() {
  const db = await getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS wa_inbound_dedup (
    wamid TEXT PRIMARY KEY,
    received_at TEXT NOT NULL
  )`);
}

/** Returns true if this wamid is new (and records it). False = duplicate. */
export async function claimWhatsappMessageId(wamid: string): Promise<boolean> {
  if (!wamid) return true;
  await ensureDedupTable();
  const db = await getDb();
  try {
    await db.execute({
      sql: `INSERT INTO wa_inbound_dedup (wamid, received_at) VALUES (?, ?)`,
      args: [wamid, new Date().toISOString()],
    });
    return true;
  } catch {
    return false;
  }
}
