/** Normalize to WhatsApp digits (India default 91). */
export function normalizePhone(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `91${digits.slice(1)}`;
  return digits;
}

export function phonesEqual(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function displayPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.startsWith("91") && n.length === 12) return n.slice(2);
  return n;
}

export function extractPhoneToken(text: string): string | null {
  const m = String(text).match(/(?:\+?91[\s-]*)?[6-9]\d{9}/);
  return m ? normalizePhone(m[0]) : null;
}

/** Default: मधुसुदनदास विजयानंद — 9850120960 */
export function guruPhones(): string[] {
  const env = process.env.GURU_PHONES || process.env.GURU_PHONE || "9850120960";
  return env
    .split(",")
    .map((p) => normalizePhone(p.trim()))
    .filter(Boolean);
}

export function isGuruPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return guruPhones().some((g) => g === n);
}
