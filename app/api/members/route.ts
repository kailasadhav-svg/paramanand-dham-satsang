import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import {
  getPlace,
  listSatsangiMembers,
  upsertSatsangiMember,
} from "@/lib/db";
import { displayPhone, normalizePhone } from "@/lib/offline/phone";
import { canAppointSatsangi, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromRequest(request: Request): string {
  return normalizePhone(request.headers.get("x-actor-phone") || "");
}

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor || !canAppointSatsangi(detectStaffRole(actor))) {
    return jsonError("फक्त संचालक / संवादक / चरणसेवक यादी पाहू शकतात", 403);
  }

  const members = await listSatsangiMembers();
  return NextResponse.json({
    members: members.map((m) => ({
      ...m,
      phone_display: displayPhone(m.phone),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actor = actorFromRequest(request);
  if (!actor || !canAppointSatsangi(detectStaffRole(actor))) {
    return jsonError("फक्त संचालक / संवादक / चरणसेवक नेमणूक करू शकतात", 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    name?: string;
    home_place_id?: number;
  };
  if (!body.name?.trim()) return jsonError("नाव आवश्यक", 400);
  if (!body.phone || String(body.phone).replace(/\D/g, "").length < 10) {
    return jsonError("१० अंकी मोबाइल आवश्यक", 400);
  }

  const homePlaceId = Number(body.home_place_id);
  if (!Number.isFinite(homePlaceId)) {
    return jsonError("स्थळ निवडा — सत्संगी त्याच स्थळाचा राहील", 400);
  }
  const place = await getPlace(homePlaceId);
  if (!place) return jsonError("स्थान सापडले नाही", 404);

  const member = await upsertSatsangiMember({
    phone: body.phone,
    name: body.name,
    appointed_by_phone: actor,
    home_place_id: homePlaceId,
  });

  return NextResponse.json({
    member: {
      ...member,
      phone_display: displayPhone(member.phone),
      home_place_name: place.name,
    },
  });
}
