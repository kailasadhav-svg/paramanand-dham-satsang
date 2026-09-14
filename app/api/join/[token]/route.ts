import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import {
  checkInPerson,
  getJoinLinkByToken,
  getPlace,
  upsertSatsangiMember,
} from "@/lib/db";
import { displayPhone, normalizePhone } from "@/lib/offline/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/** Public: load join link context (no session). */
export async function GET(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const link = await getJoinLinkByToken(token);
  if (!link) return jsonError("लिंक अवैध किंवा कालबाह्य", 404);
  const place = await getPlace(link.place_id);
  if (!place) return jsonError("स्थळ सापडले नाही", 404);

  return NextResponse.json({
    token: link.token,
    place: { id: place.id, name: place.name },
    meeting_date: link.meeting_date,
  });
}

/**
 * Public: name + mobile + weekly opinion → सत्संगी चरणसेवक + self attendance.
 * No session cookie required (share link for non-app users).
 */
export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const link = await getJoinLinkByToken(token);
  if (!link) return jsonError("लिंक अवैध किंवा कालबाह्य", 404);

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    opinion?: string;
  };
  if (!body.name?.trim()) return jsonError("नाव आवश्यक", 400);
  if (!body.phone || String(body.phone).replace(/\D/g, "").length < 10) {
    return jsonError("१० अंकी मोबाइल आवश्यक", 400);
  }

  const phone = normalizePhone(body.phone);
  const member = await upsertSatsangiMember({
    phone,
    name: body.name,
    appointed_by_phone: link.created_by_phone,
  });

  const result = await checkInPerson({
    place_id: link.place_id,
    meeting_date: link.meeting_date,
    phone,
    name: member.name,
    source: "link",
    opinion: body.opinion || null,
  });

  const place = await getPlace(link.place_id);

  return NextResponse.json({
    ok: true,
    already: result.already,
    total: result.total,
    role_label: "सत्संगी चरणसेवक",
    member: { name: member.name, phone_display: displayPhone(member.phone) },
    place_name: place?.name,
    meeting_date: link.meeting_date,
    message: result.already
      ? "तुमची उपस्थिती आधीच नोंदली आहे · सत्संगी चरणसेवक"
      : `नोंद झाली · सत्संगी चरणसेवक · एकूण उपस्थिती ${result.total}`,
  });
}
