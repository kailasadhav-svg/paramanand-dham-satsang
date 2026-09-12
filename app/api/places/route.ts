import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-guard";
import { listPlaces } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ places: await listPlaces() });
}
