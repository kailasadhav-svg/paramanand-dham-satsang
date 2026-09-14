import { NextResponse } from "next/server";
import { getMemberId, getSession } from "@/lib/auth";
import { getMemberById, type Member } from "@/lib/members";

export async function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Admin PIN session — existing attendance / topic / questions / report APIs. */
export async function requireApiSession() {
  const ok = await getSession();
  if (!ok) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  return { ok: true as const };
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
