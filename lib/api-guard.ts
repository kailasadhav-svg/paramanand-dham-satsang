import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiSession() {
  const ok = await getSession();
  if (!ok) {
    return { ok: false as const, response: await jsonError("Unauthorized", 401) };
  }
  return { ok: true as const };
}
