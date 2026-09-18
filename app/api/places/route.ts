import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import {
  getSatsangiByPhone,
  listDutiesForPhone,
  listPlaces,
  updatePlaceCoords,
} from "@/lib/db";
import { defaultThursdayYmd } from "@/lib/dates";
import {
  canEditAnyPlaceTopic,
  canSeeStaffScreens,
  detectStaffRole,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  const role = actor ? detectStaffRole(actor) : "charansevak";
  const all = await listPlaces();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || defaultThursdayYmd();

  if (actor && !canSeeStaffScreens(role)) {
    const duties = await listDutiesForPhone(actor, date);
    if (duties.length) {
      const ids = new Set(duties.map((d) => d.place_id));
      const places = all.filter((p) => ids.has(p.id));
      return NextResponse.json({
        places,
        default_place_id: places[0]?.id ?? null,
        place_locked: true,
        is_vahak: true,
        can_edit_topic: true,
        member_name: duties[0]?.charansevak_name ?? null,
      });
    }
    try {
      const member = await getSatsangiByPhone(actor);
      if (member?.home_place_id) {
        const home = all.find((p) => p.id === member.home_place_id);
        if (home) {
          return NextResponse.json({
            places: [home],
            default_place_id: home.id,
            place_locked: true,
            is_vahak: false,
            can_edit_topic: false,
            member_name: member.name,
          });
        }
      }
    } catch {
      // invalid phone length etc. — fall through to all places
    }
  }

  const nashik = all.find((p) => p.name === "नाशिक");
  return NextResponse.json({
    places: all,
    default_place_id: nashik?.id ?? all[0]?.id ?? null,
    place_locked: false,
    is_vahak: false,
    can_edit_topic: actor ? canEditAnyPlaceTopic(role) : false,
  });
}

/** मार्गदर्शक / संगणक: सत्संग स्थळाचे GPS सेट करा */
export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor || !canSeeStaffScreens(detectStaffRole(actor))) {
    return jsonError("फक्त मार्गदर्शक / संगणक स्थळ GPS सेट करू शकतात", 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    place_id?: number;
    latitude?: number;
    longitude?: number;
  };
  if (
    !body.place_id ||
    !Number.isFinite(Number(body.latitude)) ||
    !Number.isFinite(Number(body.longitude))
  ) {
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
