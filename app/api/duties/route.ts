import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import {
  clearDuty,
  listDutiesOnDate,
  listPlaces,
  upsertDuty,
} from "@/lib/db";
import { displayPhone, normalizePhone } from "@/lib/offline/phone";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromRequest(request: Request): string {
  const header = request.headers.get("x-actor-phone") || "";
  return normalizePhone(header);
}

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return jsonError("date आवश्यक", 400);

  const actor = actorFromRequest(request);
  const role = actor ? detectStaffRole(actor) : "charansevak";
  const places = await listPlaces();
  let duties = await listDutiesOnDate(date);

  if (!canSeeStaffScreens(role) && actor) {
    duties = duties.filter((d) => normalizePhone(d.charansevak_phone) === actor);
  }

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

  const visible = canSeeStaffScreens(role)
    ? rows
    : rows.filter((r) => r.duty != null);

  return NextResponse.json({
    date,
    role,
    can_assign: canSeeStaffScreens(role),
    rows: visible,
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor || !canSeeStaffScreens(detectStaffRole(actor))) {
    return jsonError("फक्त गुरु / सॉफ्टवेअर नेमणूक करू शकतात", 403);
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
    return jsonError("चरणसेवक मोबाइल आवश्यक", 400);
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
