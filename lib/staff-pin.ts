import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { normalizePhone } from "./ajapa/phone.ts";

export const STAFF_PIN_MIN = 4;
export const STAFF_PIN_MAX = 6;
export const FIRST_TIME_CODE_LEN = 4;

export function digitsOnly(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function validStaffPin(pin: string): boolean {
  return new RegExp(`^\\d{${STAFF_PIN_MIN},${STAFF_PIN_MAX}}$`).test(pin);
}

/** First login secret: the last 4 digits of the staff mobile. */
export function firstTimeCode(phone: string): string {
  return normalizePhone(phone).slice(-FIRST_TIME_CODE_LEN);
}

export function safeEqualDigits(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const SCRYPT_KEYLEN = 32;

export function hashStaffPin(pin: string, salt = randomBytes(16).toString("hex")): string {
  const key = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyStaffPinHash(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, salt, key] = stored.split("$");
  if (algo !== "scrypt" || !salt || !key) return false;
  const candidate = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return safeEqualDigits(candidate, key);
}

export type StaffPinCheck =
  | { ok: true }
  | { ok: false; error: string };

/** Rules for a brand-new PIN chosen on first login. */
export function checkNewStaffPin(pin: string, phone: string): StaffPinCheck {
  if (!validStaffPin(pin)) {
    return { ok: false, error: `पिन ${STAFF_PIN_MIN} ते ${STAFF_PIN_MAX} अंकी हवा` };
  }
  if (pin === firstTimeCode(phone)) {
    return { ok: false, error: "पिन मोबाइलच्या शेवटच्या ४ अंकांपेक्षा वेगळा ठेवा" };
  }
  if (/^(\d)\1+$/.test(pin)) {
    return { ok: false, error: "सर्व अंक सारखे नकोत (उदा. 1111)" };
  }
  return { ok: true };
}
