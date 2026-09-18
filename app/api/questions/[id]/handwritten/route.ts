import { NextResponse } from "next/server";
import { jsonError, requireGuideActor, routeErrorResponse } from "@/lib/api-guard";
import { getQuestion } from "@/lib/db";
import { HANDWRITTEN_PHOTO_HELP } from "@/lib/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * मार्गदर्शक: photo of handwritten answer per question.
 * TODO: accept image upload and store (no local disk / no VPS media).
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireGuideActor();
  if (!auth.ok) return auth.response;
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return jsonError("अवैध प्रश्न", 400);
  try {
    const question = await getQuestion(id);
    if (!question) return jsonError("प्रश्न सापडला नाही", 404);
    const body = (await request.json().catch(() => ({}))) as {
      filename?: string;
    };
    return NextResponse.json({
      todo: true,
      message: `TODO: ${HANDWRITTEN_PHOTO_HELP}`,
      question_id: id,
      filename: body.filename || null,
    });
  } catch (err) {
    return routeErrorResponse(err, "हस्तलिखित अपलोड अयशस्वी");
  }
}
