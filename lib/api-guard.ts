import { NextResponse } from "next/server";
import { getActorPhone, getMemberId, getSession } from "@/lib/auth";
import { getMemberById, type Member } from "@/lib/members";

export async function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Admin PIN session — attendance / topic / questions / report APIs. */
export async function requireApiSession() {
  const ok = await getSession();
  if (!ok) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  return { ok: true as const };
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
