import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import {
  checkInPerson,
  getDuty,
  getPlace,
  getSatsangiByPhone,
  listAttendancePeople,
} from "@/lib/db";
import { displayPhone, normalizePhone } from "@/lib/offline/phone";
import { canAppointSatsangi, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromRequest(request: Request): string {
  return normalizePhone(request.headers.get("x-actor-phone") || "");
}

/** List who checked in at a place/date. */
export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const placeId = Number(searchParams.get("place_id"));
  const date = searchParams.get("date");
  if (!placeId || !date) return jsonError("place_id आणि date आवश्यक", 400);

  const people = await listAttendancePeople(placeId, date);
  return NextResponse.json({
    place_id: placeId,
    date,
    total: people.length,
    people: people.map((p) => ({
      ...p,
      phone_display: displayPhone(p.phone),
    })),
  });
}

/** Self check-in only — cannot mark others. */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const body = (await request.json().catch(() => ({}))) as {
    place_id?: number;
    meeting_date?: string;
    name?: string;
  };
  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }

  const place = await getPlace(Number(body.place_id));
  if (!place) return jsonError("स्थळ सापडले नाही", 404);

  const role = detectStaffRole(actor);
  // Staff may check themselves in too; satsangi must exist or provide name once
  let name = body.name?.trim() || null;
  if (!canAppointSatsangi(role)) {
    const member = await getSatsangiByPhone(actor);
    if (member) name = member.name;
    else if (!name) {
      return jsonError("आधी नेमणूक / लिंकने नोंद करा (नाव आवश्यक)", 400);
    }
  }

  const result = await checkInPerson({
    place_id: Number(body.place_id),
    meeting_date: String(body.meeting_date),
    phone: actor,
    name,
    source: "app",
  });

  const duty = await getDuty(Number(body.place_id), String(body.meeting_date));

  return NextResponse.json({
    ok: true,
    already: result.already,
    total: result.total,
    person: {
      ...result.person,
      phone_display: displayPhone(result.person.phone),
    },
    duty: duty
      ? {
          name: duty.charansevak_name,
          phone_display: displayPhone(duty.charansevak_phone),
        }
      : null,
    message: result.already
      ? "तुमची उपस्थिती आधीच नोंदली आहे"
      : `उपस्थिती नोंदली · एकूण ${result.total}`,
  });
}
