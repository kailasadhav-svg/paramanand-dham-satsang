import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import {
  clearDuty,
  getPreviousDutySamePlace,
  getSatsangiByPhone,
  listDutiesOnDate,
  listPlaces,
  listPlacesForActor,
  listSatsangiMembers,
  upsertDuty,
  upsertSatsangiMember,
} from "@/lib/db";
import { displayPhone, normalizePhone, phonesEqual } from "@/lib/offline/phone";
import {
  canAppointSatsangi,
  canAssignConductor,
  canSeeStaffScreens,
  detectStaffRole,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromRequest(request: Request): string {
  return normalizePhone(request.headers.get("x-actor-phone") || "");
}

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return jsonError("date आवश्यक", 400);

  const actor = actorFromRequest(request);
  const role = actor ? detectStaffRole(actor) : "satsangi";
  const places = await listPlaces();
  let duties = await listDutiesOnDate(date);

  const canAssign = actor ? canAssignConductor(role) : false;
  const canAppoint = actor ? canAppointSatsangi(role) : false;

  if (!canAssign && actor) {
    duties = duties.filter((d) => normalizePhone(d.charansevak_phone) === actor);
  }

  const rows = [];
  for (const place of places) {
    const duty = duties.find((d) => d.place_id === place.id) ?? null;
    let rotateHint: string | null = null;
    if (canAssign && duty) {
      const prev = await getPreviousDutySamePlace(place.id, date);
      if (
        prev &&
        phonesEqual(prev.charansevak_phone, duty.charansevak_phone)
      ) {
        rotateHint =
          "गेल्या गुरुवारीही हेच संचालन — शक्यतो वेगळा सत्संगी ठेवा (अनिवार्य नाही)";
      }
    }
    rows.push({
      place,
      duty: duty
        ? {
            ...duty,
            charansevak_phone_display: displayPhone(duty.charansevak_phone),
            rotate_hint: rotateHint,
          }
        : null,
    });
  }

  let visible = canAssign ? rows : rows.filter((r) => r.duty != null);
  let placeLocked = false;
  let defaultPlaceId: number | null = null;

  // सत्संगी: फक्त घरचे स्थळ — संचालन नसले तरी तेच default
  if (!canAssign && actor && role === "satsangi") {
    const scoped = await listPlacesForActor({ phone: actor, role });
    placeLocked = scoped.place_locked;
    defaultPlaceId = scoped.default_place_id;
    if (scoped.places.length) {
      const homeIds = new Set(scoped.places.map((p) => p.id));
      visible = rows.filter((r) => homeIds.has(r.place.id));
      for (const p of scoped.places) {
        if (!visible.some((r) => r.place.id === p.id)) {
          visible.push({ place: p, duty: null });
        }
      }
    } else {
      visible = [];
    }
  }

  return NextResponse.json({
    date,
    role,
    can_assign: canAssign,
    can_appoint: canAppoint,
    can_full_staff: canSeeStaffScreens(role),
    place_locked: placeLocked,
    default_place_id: defaultPlaceId,
    rows: visible,
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor || !canAssignConductor(detectStaffRole(actor))) {
    return jsonError(
      "फक्त संचालक / संवादक / चरणसेवक संचालन नेमणूक करू शकतात",
      403,
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    place_id?: number;
    meeting_date?: string;
    charansevak_phone?: string;
    charansevak_name?: string | null;
    clear?: boolean;
  };

  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }

  if (body.clear) {
    await clearDuty(Number(body.place_id), String(body.meeting_date));
    return NextResponse.json({ ok: true, cleared: true });
  }

  if (
    !body.charansevak_phone ||
    String(body.charansevak_phone).replace(/\D/g, "").length < 10
  ) {
    return jsonError("सत्संगी चरणसेवक मोबाइल आवश्यक", 400);
  }

  const phone = normalizePhone(body.charansevak_phone);
  const placeId = Number(body.place_id);
  let name = body.charansevak_name?.trim() || null;
  const existing = await getSatsangiByPhone(phone);
  if (existing) {
    name = name || existing.name;
    await upsertSatsangiMember({
      phone,
      name,
      appointed_by_phone: actor,
      home_place_id: placeId,
    });
  } else if (name) {
    await upsertSatsangiMember({
      phone,
      name,
      appointed_by_phone: actor,
      home_place_id: placeId,
    });
  } else {
    return jsonError(
      "नवीन व्यक्तीसाठी नाव आवश्यक — किंवा यादीतील सत्संगी निवडा",
      400,
    );
  }

  const duty = await upsertDuty({
    place_id: placeId,
    meeting_date: String(body.meeting_date),
    charansevak_phone: phone,
    charansevak_name: name,
    assigned_by_phone: actor,
  });

  const prev = await getPreviousDutySamePlace(placeId, String(body.meeting_date));
  const sameAsLast =
    prev != null && phonesEqual(prev.charansevak_phone, duty.charansevak_phone);

  return NextResponse.json({
    duty: {
      ...duty,
      charansevak_phone_display: displayPhone(duty.charansevak_phone),
    },
    rotate_hint: sameAsLast
      ? "गेल्या गुरुवारीही हेच संचालन — शक्यतो वेगळा ठेवा (अनिवार्य नाही)"
      : null,
    members: (await listSatsangiMembers()).map((m) => ({
      ...m,
      phone_display: displayPhone(m.phone),
    })),
  });
}
