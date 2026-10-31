import { NextResponse } from "next/server";
import {
  jsonError,
  requireActorPhone,
  requireStaffActor,
  routeErrorResponse,
} from "@/lib/api-guard";
import { createEvent, listEvents } from "@/lib/db";
import { parseEventInput } from "@/lib/events";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireActorPhone();
  if (!auth.ok) return auth.response;
  try {
    const events = await listEvents();
    return NextResponse.json({
      events,
      can_manage: canSeeStaffScreens(detectStaffRole(auth.phone)),
    });
  } catch (err) {
    return routeErrorResponse(err, "कार्यक्रम लोड अयशस्वी");
  }
}

/** संगणक / मार्गदर्शक: नवीन कार्यक्रम */
export async function POST(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const parsed = parseEventInput(await request.json().catch(() => ({})));
  if (!parsed.ok) return jsonError(parsed.error, 400);
  try {
    const event = await createEvent({ ...parsed.value, created_by_phone: auth.phone });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return routeErrorResponse(err, "कार्यक्रम जतन अयशस्वी");
  }
}
