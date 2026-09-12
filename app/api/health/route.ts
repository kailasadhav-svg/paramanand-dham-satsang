import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await pingDb();
    return NextResponse.json({ ok: true, name: "परमानंद धाम सत्संग", db });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db error";
    return NextResponse.json(
      { ok: false, name: "परमानंद धाम सत्संग", error: message },
      { status: 503 },
    );
  }
}
