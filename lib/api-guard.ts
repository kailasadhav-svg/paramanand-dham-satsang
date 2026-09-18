import { NextResponse } from "next/server";
import { getActorPhone, getMemberId, getSession } from "@/lib/auth";
import { getMemberById, type Member } from "@/lib/members";
import {
  canSeeGuideScreens,
  canSeeStaffScreens,
  detectStaffRole,
  type StaffRole,
} from "@/lib/roles";

export async function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function routeErrorResponse(err: unknown, fallback = "सेवा त्रुटी") {
  console.error(err);
  const status = (err as { status?: number }).status;
  if (status === 401) return jsonError("Unauthorized", 401);
  const message = err instanceof Error && err.message ? err.message : fallback;
  return jsonError(message, 503);
}

/** Admin PIN session — attendance / topic / questions / report APIs. */
export async function requireApiSession() {
  const ok = await getSession();
  if (!ok) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  return { ok: true as const };
}

/** संगणक / मार्गदर्शक — weekly report + GPS + login-code list. */
export async function requireStaffActor(): Promise<
  | { ok: true; phone: string; role: StaffRole }
  | { ok: false; response: NextResponse }
> {
  const actor = await requireActorPhone();
  if (!actor.ok) return actor;
  const role = detectStaffRole(actor.phone);
  if (!canSeeStaffScreens(role)) {
    return {
      ok: false as const,
      response: await jsonError("फक्त संगणक / मार्गदर्शक", 403),
    };
  }
  return { ok: true as const, phone: actor.phone, role };
}

/** मार्गदर्शक only — topics, all चिंतन, member approval, Vahak, all अजपा. */
export async function requireGuideActor(): Promise<
  | { ok: true; phone: string; role: StaffRole }
  | { ok: false; response: NextResponse }
> {
  const actor = await requireActorPhone();
  if (!actor.ok) return actor;
  const role = detectStaffRole(actor.phone);
  if (!canSeeGuideScreens(role)) {
    return {
      ok: false as const,
      response: await jsonError("फक्त मार्गदर्शक चरणसेवक", 403),
    };
  }
  return { ok: true as const, phone: actor.phone, role };
}

/**
 * Session + verified actor cookie (set via /api/auth/actor after phone bind).
 * Does not trust spoofable x-actor-phone headers.
 */
export async function requireActorPhone(): Promise<
  { ok: true; phone: string } | { ok: false; response: NextResponse }
> {
  const session = await requireApiSession();
  if (!session.ok) return session;
  const phone = await getActorPhone();
  if (!phone) {
    return {
      ok: false as const,
      response: await jsonError("मोबाइल प्रोफाइल आवश्यक — पुन्हा निवडा", 401),
    };
  }
  return { ok: true as const, phone };
}

export async function requireMemberApi(): Promise<
  { ok: true; member: Member } | { ok: false; response: NextResponse }
> {
  const id = await getMemberId();
  if (!id) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  const member = await getMemberById(id);
  if (!member) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  return { ok: true as const, member };
}
