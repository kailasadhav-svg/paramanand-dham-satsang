import { NextResponse } from "next/server";
import {
  jsonError,
  requireActorPhone,
  requireStaffActor,
  routeErrorResponse,
} from "@/lib/api-guard";
import { createPhoto, listPhotos } from "@/lib/db";
import { parsePhotoInput } from "@/lib/events";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireActorPhone();
  if (!auth.ok) return auth.response;
  try {
    const photos = await listPhotos();
    return NextResponse.json({
      photos,
      can_manage: canSeeStaffScreens(detectStaffRole(auth.phone)),
    });
  } catch (err) {
    return routeErrorResponse(err, "छायाचित्रे लोड अयशस्वी");
  }
}

/** संगणक / मार्गदर्शक: छायाचित्राची लिंक जोडा */
export async function POST(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const parsed = parsePhotoInput(await request.json().catch(() => ({})));
  if (!parsed.ok) return jsonError(parsed.error, 400);
  try {
    const photo = await createPhoto({ ...parsed.value, created_by_phone: auth.phone });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    return routeErrorResponse(err, "छायाचित्र जतन अयशस्वी");
  }
}
