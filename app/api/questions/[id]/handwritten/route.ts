import { NextResponse } from "next/server";
import {
  jsonError,
  requireActorPhone,
  requireGuideActor,
  routeErrorResponse,
} from "@/lib/api-guard";
import {
  clearQuestionHandwritten,
  getQuestion,
  getQuestionHandwritten,
  setQuestionHandwritten,
} from "@/lib/db";
import { MAX_THUMB_BYTES, MAX_UPLOAD_BYTES, validateUploadBytes } from "@/lib/events";
import { canSeeGuideScreens, detectStaffRole, phonesEqual } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function questionId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** मार्गदर्शक: हस्तलिखित उत्तराचा फोटो (multipart: image, thumb). Counts as answered. */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireGuideActor();
  if (!auth.ok) return auth.response;
  const id = await questionId(ctx);
  if (!id) return jsonError("अवैध प्रश्न", 400);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("अपलोड डेटा वाचता आला नाही", 400);
  const image = form.get("image");
  if (!(image instanceof Blob)) return jsonError("छायाचित्र आवश्यक", 400);
  const imageBytes = new Uint8Array(await image.arrayBuffer());
  const imageMime = validateUploadBytes(imageBytes, MAX_UPLOAD_BYTES, "छायाचित्र");
  if (!imageMime.ok) return jsonError(imageMime.error, 400);

  let thumbBytes: Uint8Array | null = null;
  const thumb = form.get("thumb");
  if (thumb instanceof Blob && thumb.size > 0) {
    thumbBytes = new Uint8Array(await thumb.arrayBuffer());
    const thumbMime = validateUploadBytes(thumbBytes, MAX_THUMB_BYTES, "लहान चित्र");
    if (!thumbMime.ok) return jsonError(thumbMime.error, 400);
  }

  try {
    const question = await setQuestionHandwritten(id, {
      image: imageBytes,
      thumb: thumbBytes,
      mime: imageMime.value,
    });
    if (!question) return jsonError("प्रश्न सापडला नाही", 404);
    return NextResponse.json({ question });
  } catch (err) {
    return routeErrorResponse(err, "हस्तलिखित अपलोड अयशस्वी");
  }
}

/** Image bytes — मार्गदर्शक, or the member who asked this question. */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireActorPhone();
  if (!auth.ok) return auth.response;
  const id = await questionId(ctx);
  if (!id) return jsonError("अवैध प्रश्न", 400);
  const size = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  try {
    const question = await getQuestion(id);
    if (!question) return jsonError("प्रश्न सापडला नाही", 404);
    const guide = canSeeGuideScreens(detectStaffRole(auth.phone));
    const asker = question.asked_by_phone
      ? phonesEqual(question.asked_by_phone, auth.phone)
      : false;
    if (!guide && !asker) return jsonError("फक्त प्रश्नकर्ता / मार्गदर्शक", 403);
    const img = await getQuestionHandwritten(id, size);
    if (!img) return jsonError("हस्तलिखित उत्तर नाही", 404);
    return new NextResponse(Buffer.from(img.bytes), {
      headers: {
        "Content-Type": img.mime,
        "Content-Length": String(img.bytes.byteLength),
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return routeErrorResponse(err, "हस्तलिखित लोड अयशस्वी");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireGuideActor();
  if (!auth.ok) return auth.response;
  const id = await questionId(ctx);
  if (!id) return jsonError("अवैध प्रश्न", 400);
  try {
    const question = await clearQuestionHandwritten(id);
    if (!question) return jsonError("प्रश्न सापडला नाही", 404);
    return NextResponse.json({ question });
  } catch (err) {
    return routeErrorResponse(err, "हस्तलिखित काढता आले नाही");
  }
}
