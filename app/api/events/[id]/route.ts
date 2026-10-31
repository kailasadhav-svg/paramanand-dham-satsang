import { NextResponse } from "next/server";
import { jsonError, requireStaffActor, routeErrorResponse } from "@/lib/api-guard";
import { deleteEvent } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) return jsonError("अवैध कार्यक्रम", 400);
  try {
    const ok = await deleteEvent(eventId);
    if (!ok) return jsonError("कार्यक्रम सापडला नाही", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return routeErrorResponse(err, "कार्यक्रम काढता आला नाही");
  }
}
