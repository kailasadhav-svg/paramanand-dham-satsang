import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { listPlacesForActor, updatePlaceCoords } from "@/lib/db";
import { normalizePhone } from "@/lib/offline/phone";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  const role = actor ? detectStaffRole(actor) : "satsangi";
  const result = actor
    ? await listPlacesForActor({ phone: actor, role })
    : { places: [], default_place_id: null, place_locked: true };

  return NextResponse.json(result);
}

/** संवादक / संचालक: सत्संग स्थळाचे GPS सेट करा */
export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  if (!actor || !canSeeStaffScreens(detectStaffRole(actor))) {
    return jsonError("फक्त संवादक / संचालक स्थळ GPS सेट करू शकतात", 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    place_id?: number;
    latitude?: number;
    longitude?: number;
  };
  if (!body.place_id || !Number.isFinite(Number(body.latitude)) || !Number.isFinite(Number(body.longitude))) {
    return jsonError("place_id, latitude, longitude आवश्यक", 400);
  }

  const place = await updatePlaceCoords(
    Number(body.place_id),
    Number(body.latitude),
    Number(body.longitude),
  );
  if (!place) return jsonError("स्थान सापडले नाही", 404);
  return NextResponse.json({ place });
}
