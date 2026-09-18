import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  adminPin,
  sessionSecret,
} from "./auth-policy.ts";

export {
  DEFAULT_ADMIN_PIN,
  DEFAULT_SESSION_SECRET,
  adminPin,
  clearCookieOptions,
  hasWeakAuthSecrets,
  isVercelRuntime,
  productionAuthBlockedReason,
  sessionCookieOptions,
  sessionSecret,
} from "./auth-policy.ts";

export const SESSION_COOKIE = "satsang_session";
export const MEMBER_COOKIE = "satsang_member";
export const ACTOR_COOKIE = "satsang_actor";

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function expectedSessionToken(): string {
  return createHmac("sha256", sessionSecret())
    .update(`admin:${adminPin()}`)
    .digest("hex");
}

export function verifyPin(pin: string): boolean {
  return safeEqualString(pin.trim(), adminPin());
}

export function isSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return safeEqualString(token, expectedSessionToken());
}

export function memberSessionToken(memberId: number): string {
  const hmac = createHmac("sha256", sessionSecret())
    .update(`member:${memberId}`)
    .digest("hex");
  return `${memberId}.${hmac}`;
}

export function parseMemberSessionToken(token: string | undefined | null): number | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = Number(token.slice(0, dot));
  if (!Number.isInteger(id) || id <= 0) return null;
  const expected = memberSessionToken(id);
  if (!safeEqualString(token, expected)) return null;
  return id;
}

export function actorSessionToken(phone: string): string {
  const hmac = createHmac("sha256", sessionSecret())
    .update(`actor:${phone}`)
    .digest("hex");
  return `${phone}.${hmac}`;
}

export function parseActorSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const phone = token.slice(0, dot);
  if (!/^\d{10,15}$/.test(phone)) return null;
  const expected = actorSessionToken(phone);
  if (!safeEqualString(token, expected)) return null;
  return phone;
}

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  return isSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function getMemberId(): Promise<number | null> {
  const jar = await cookies();
  return parseMemberSessionToken(jar.get(MEMBER_COOKIE)?.value);
}

/** Verified actor phone from signed cookie — never trust x-actor-phone. */
export async function getActorPhone(): Promise<string | null> {
  const jar = await cookies();
  return parseActorSessionToken(jar.get(ACTOR_COOKIE)?.value);
}

export async function requireSession(): Promise<void> {
  const ok = await getSession();
  if (!ok) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}
