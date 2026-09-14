import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { createJoinLink, getPlace } from "@/lib/db";
import { normalizePhone } from "@/lib/offline/phone";
import { canAppointSatsangi, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromRequest(request: Request): string {
  return normalizePhone(request.headers.get("x-actor-phone") || "");
}

/** Create shareable link for people without the app. */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor || !canAppointSatsangi(detectStaffRole(actor))) {
    return jsonError("फक्त संचालक / संवादक / चरणसेवक लिंक देऊ शकतात", 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    place_id?: number;
    meeting_date?: string;
  };
  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }
  const place = await getPlace(Number(body.place_id));
  if (!place) return jsonError("स्थळ सापडले नाही", 404);

  const token = randomBytes(9).toString("base64url");
  const link = await createJoinLink({
    token,
    place_id: Number(body.place_id),
    meeting_date: String(body.meeting_date),
    created_by_phone: actor,
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/j/${link.token}`;

  return NextResponse.json({
    token: link.token,
    url,
    place: { id: place.id, name: place.name },
    meeting_date: link.meeting_date,
  });
}
