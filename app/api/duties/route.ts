import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone } from "@/lib/api-guard";
import {
  DUTY_KIND_SATSANG,
  DUTY_KIND_VAHAK,
  asDutyKind,
  clearDuty,
  getDuty,
  listDutiesOnDate,
  listPlaces,
  upsertDuty,
  type PlaceDuty,
  type PlaceDutyKind,
} from "@/lib/db";
import { addDaysYmd, isFridayVahakAppointWindowForWeek } from "@/lib/dates";
import {
  SATSANG_CHARANSEVAK_APPOINT_HELP,
  SATSANG_CHARANSEVAK_LABEL,
  VAHAK_APPOINT_HELP,
} from "@/lib/labels";
import { displayPhone, phonesEqual } from "@/lib/offline/phone";
import {
  canAppointSatsangCharansevak,
  canAppointVahak,
  canSeeGuideScreens,
  canSeeStaffScreens,
  detectStaffRole,
  type StaffRole,
} from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicDuty(duty: PlaceDuty | null) {
  if (!duty) return null;
  return {
    ...duty,
    charansevak_phone_display: displayPhone(duty.charansevak_phone),
  };
}

function actorHolds(
  duty: PlaceDuty | null | undefined,
  actor: string | null,
): boolean {
  return Boolean(duty && actor && phonesEqual(duty.charansevak_phone, actor));
}

async function canPutSatsangDuty(opts: {
  role: StaffRole;
  actor: string;
  placeId: number;
  meetingDate: string;
  existing: PlaceDuty | undefined;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (canAppointSatsangCharansevak(opts.role)) return { ok: true };
  if (opts.role !== "charansevak") {
    return { ok: false, message: SATSANG_CHARANSEVAK_APPOINT_HELP };
  }
  if (opts.existing) {
    return { ok: false, message: "नेमणूक आधीच आहे — फक्त मार्गदर्शक बदलू शकतात" };
  }
  const previous = await getDuty(
    opts.placeId,
    addDaysYmd(opts.meetingDate, -7),
    DUTY_KIND_SATSANG,
  );
  if (!actorHolds(previous, opts.actor)) {
    return { ok: false, message: SATSANG_CHARANSEVAK_APPOINT_HELP };
  }
  return { ok: true };
}

async function canPutVahakDuty(opts: {
  role: StaffRole;
  actor: string;
  placeId: number;
  meetingDate: string;
  existing: PlaceDuty | undefined;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (
    !canAppointVahak(opts.role, {
      hasDuty: Boolean(opts.existing),
      meetingDate: opts.meetingDate,
    })
  ) {
    return { ok: false, message: VAHAK_APPOINT_HELP };
  }
  if (canSeeGuideScreens(opts.role)) return { ok: true };
  const satsang = await getDuty(opts.placeId, opts.meetingDate, DUTY_KIND_SATSANG);
  if (!actorHolds(satsang, opts.actor)) {
    return {
      ok: false,
      message: `फक्त या स्थळाचे ${SATSANG_CHARANSEVAK_LABEL} शुक्रवारी विचार वाहक नेमू शकतात`,
    };
  }
  return { ok: true };
}

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
  const vahakDuties = await listDutiesOnDate(date, DUTY_KIND_VAHAK);
  const satsangDuties = await listDutiesOnDate(date, DUTY_KIND_SATSANG);
  const prevSatsangDuties = await listDutiesOnDate(
    addDaysYmd(date, -7),
    DUTY_KIND_SATSANG,
  );

  const rows = places.map((place) => {
    const duty = vahakDuties.find((d) => d.place_id === place.id) ?? null;
    const satsangDuty =
      satsangDuties.find((d) => d.place_id === place.id) ?? null;
    return {
      place,
      duty: publicDuty(duty),
      satsang_duty: publicDuty(satsangDuty),
    };
  });

  const holdsThisSatsang = (placeId: number) =>
    actorHolds(
      satsangDuties.find((d) => d.place_id === placeId),
      actor,
    );
  const heldPrevSatsang = (placeId: number) =>
    actorHolds(
      prevSatsangDuties.find((d) => d.place_id === placeId),
      actor,
    );

  const visible = staff
    ? rows
    : rows.filter((r) => holdsThisSatsang(r.place.id) || heldPrevSatsang(r.place.id));

  const canAssignSatsang =
    canAppointSatsangCharansevak(role) ||
    visible.some((r) => heldPrevSatsang(r.place.id));

  const canAssignVahak =
    canAppointVahak(role, { hasDuty: false, meetingDate: date }) &&
    (canSeeGuideScreens(role) || visible.some((r) => holdsThisSatsang(r.place.id)));

  return NextResponse.json({
    date,
    role,
    can_assign: canAssignVahak,
    can_assign_satsang: canAssignSatsang,
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
    duty_kind?: string;
    charansevak_phone?: string;
    charansevak_name?: string | null;
    clear?: boolean;
  };

  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }

  const kind: PlaceDutyKind | null = asDutyKind(body.duty_kind);
  if (!kind) return jsonError("अवैध नेमणूक प्रकार", 400);

  const placeId = Number(body.place_id);
  const meetingDate = String(body.meeting_date);
  const existing = await getDuty(placeId, meetingDate, kind);

  if (body.clear) {
    if (!canSeeGuideScreens(role)) {
      return jsonError("फक्त मार्गदर्शक नेमणूक काढू शकतात", 403);
    }
    await clearDuty(placeId, meetingDate, kind);
    return NextResponse.json({ ok: true, cleared: true, duty_kind: kind });
  }

  const allowed =
    kind === DUTY_KIND_SATSANG
      ? await canPutSatsangDuty({
          role,
          actor,
          placeId,
          meetingDate,
          existing,
        })
      : await canPutVahakDuty({
          role,
          actor,
          placeId,
          meetingDate,
          existing,
        });
  if (!allowed.ok) return jsonError(allowed.message, 403);

  if (
    !body.charansevak_phone ||
    String(body.charansevak_phone).replace(/\D/g, "").length < 10
  ) {
    return jsonError(
      kind === DUTY_KIND_SATSANG
        ? `${SATSANG_CHARANSEVAK_LABEL} मोबाइल आवश्यक`
        : "विचार वाहक मोबाइल आवश्यक",
      400,
    );
  }

  const duty = await upsertDuty({
    place_id: placeId,
    meeting_date: meetingDate,
    duty_kind: kind,
    charansevak_phone: String(body.charansevak_phone),
    charansevak_name: body.charansevak_name ?? null,
    assigned_by_phone: actor,
  });

  return NextResponse.json({
    duty: publicDuty(duty),
    duty_kind: kind,
  });
}
