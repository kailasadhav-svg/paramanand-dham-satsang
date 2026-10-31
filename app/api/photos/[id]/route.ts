import { NextResponse } from "next/server";
import { jsonError, requireStaffActor, routeErrorResponse } from "@/lib/api-guard";
import { deletePhoto } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId <= 0) return jsonError("अवैध छायाचित्र", 400);
  try {
    const ok = await deletePhoto(photoId);
    if (!ok) return jsonError("छायाचित्र सापडले नाही", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return routeErrorResponse(err, "छायाचित्र काढता आले नाही");
  }
}
