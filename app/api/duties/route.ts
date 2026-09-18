import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import {
  clearDuty,
  getDuty,
  listDutiesOnDate,
  listPlaces,
  upsertDuty,
} from "@/lib/db";
import { isFridayVahakAppointWindowForWeek } from "@/lib/dates";
import { VAHAK_APPOINT_HELP } from "@/lib/labels";
import { displayPhone, phonesEqual } from "@/lib/offline/phone";
import {
  canAppointVahak,
  canSeeStaffScreens,
  detectStaffRole,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return jsonError("date आवश्यक", 400);

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  const role = actor ? detectStaffRole(actor) : "charansevak";
  const staff = canSeeStaffScreens(role);
  const friday = isFridayVahakAppointWindowForWeek(date);
  const places = await listPlaces();
  const duties = await listDutiesOnDate(date);

  const rows = places.map((place) => {
    const duty = duties.find((d) => d.place_id === place.id) ?? null;
    return {
      place,
      duty: duty
        ? {
            ...duty,
            charansevak_phone_display: displayPhone(duty.charansevak_phone),
          }
        : null,
    };
  });

  const visible = staff
    ? rows
    : rows.filter((r) => {
        if (r.duty && actor && phonesEqual(r.duty.charansevak_phone, actor)) {
          return true;
        }
        if (friday && !r.duty) return true;
        return false;
      });

  return NextResponse.json({
    date,
    role,
    can_assign: staff || friday,
    friday_window: friday,
    rows: visible,
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  if (!actor) {
    return jsonError("मोबाइल प्रोफाइल आवश्यक — पुन्हा निवडा", 401);
  }
  const role = detectStaffRole(actor);

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

  const existing = await getDuty(Number(body.place_id), String(body.meeting_date));

  if (body.clear) {
    if (!canSeeStaffScreens(role)) {
      return jsonError("फक्त मार्गदर्शक / संगणक नेमणूक काढू शकतात", 403);
    }
    await clearDuty(Number(body.place_id), String(body.meeting_date));
    return NextResponse.json({ ok: true, cleared: true });
  }

  if (!canAppointVahak(role, {
    hasDuty: Boolean(existing),
    meetingDate: String(body.meeting_date),
  })) {
    return jsonError(VAHAK_APPOINT_HELP, 403);
  }

  if (
    !body.charansevak_phone ||
    String(body.charansevak_phone).replace(/\D/g, "").length < 10
  ) {
    return jsonError("विचार वाहक मोबाइल आवश्यक", 400);
  }

  const duty = await upsertDuty({
    place_id: Number(body.place_id),
    meeting_date: String(body.meeting_date),
    charansevak_phone: String(body.charansevak_phone),
    charansevak_name: body.charansevak_name ?? null,
    assigned_by_phone: actor,
  });

  return NextResponse.json({
    duty: {
      ...duty,
      charansevak_phone_display: displayPhone(duty.charansevak_phone),
    },
  });
}
