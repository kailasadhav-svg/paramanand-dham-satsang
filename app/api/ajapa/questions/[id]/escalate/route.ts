import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { normalizePhone, phonesEqual } from "@/lib/ajapa/phone";
import {
  escalateAjapaQuestion,
  getAjapaQuestion,
} from "@/lib/ajapa/store";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** सत्संगी / चरणसेवक: साहित्य उत्तरानंतर मधुसुदनदास विजयानंद यांच्याकडे पाठवा */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("अवैध प्रश्न", 400);

  const actor = normalizePhone(request.headers.get("x-actor-phone") || "");
  if (!actor) return jsonError("मोबाइल आवश्यक", 400);

  const existing = await getAjapaQuestion(id);
  if (!existing) return jsonError("प्रश्न सापडला नाही", 404);

  const role = detectStaffRole(actor);
  const allowed =
    canSeeStaffScreens(role) || phonesEqual(existing.seeker_phone, actor);
  if (!allowed) return jsonError("परवानगी नाही", 403);

  if (existing.status === "escalated" || existing.status === "guru_answered") {
    return NextResponse.json({ question: existing });
  }

  const question = await escalateAjapaQuestion(id);
  if (!question) return jsonError("पाठवता आले नाही", 400);
  return NextResponse.json({ question });
}
