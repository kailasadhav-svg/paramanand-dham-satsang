import { randomInt } from "crypto";

export const LAST4_LEN = 4;
export const RANDOM6_LEN = 6;

export function normalizeMobile(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const ten =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return ten;
}

export function last4OfMobile(mobile: string): string {
  return mobile.slice(-LAST4_LEN);
}

export function cryptoRandom6(): string {
  return String(randomInt(100000, 1000000));
}

/** First member keeps last-4; later same last-4 gets a unique random 6-digit. */
export async function allocateLoginCode(
  mobile: string,
  isUsed: (code: string) => boolean | Promise<boolean>,
  random6: () => string = cryptoRandom6,
): Promise<{ login_code: string; collision: boolean }> {
  const last4 = last4OfMobile(mobile);
  if (!(await isUsed(last4))) {
    return { login_code: last4, collision: false };
  }
  for (let i = 0; i < 32; i++) {
    const code = random6();
    if (code.length !== RANDOM6_LEN || !/^\d{6}$/.test(code)) continue;
    if (!(await isUsed(code))) {
      return { login_code: code, collision: true };
    }
  }
  throw new Error("login_code_exhausted");
}
