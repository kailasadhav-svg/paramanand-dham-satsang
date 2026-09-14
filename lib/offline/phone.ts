/** Client-safe phone helpers. */
export function normalizePhone(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `91${digits.slice(1)}`;
  return digits;
}

export function displayPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.startsWith("91") && n.length === 12) return n.slice(2);
  return n;
}

export function phonesEqual(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}
