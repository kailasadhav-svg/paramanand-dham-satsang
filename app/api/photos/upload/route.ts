import { NextResponse } from "next/server";
import { jsonError, requireStaffActor, routeErrorResponse } from "@/lib/api-guard";
import { createUploadedPhoto } from "@/lib/db";
import {
  MAX_THUMB_BYTES,
  MAX_UPLOAD_BYTES,
  parsePhotoMeta,
  validateUploadBytes,
} from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function positiveInt(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** संगणक / मार्गदर्शक: फोनवरून छायाचित्र अपलोड (multipart: image, thumb, caption, taken_on, event_id) */
export async function POST(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("अपलोड डेटा वाचता आला नाही", 400);

  const meta = parsePhotoMeta({
    caption: form.get("caption"),
    taken_on: form.get("taken_on"),
    event_id: form.get("event_id"),
  });
  if (!meta.ok) return jsonError(meta.error, 400);

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
    const photo = await createUploadedPhoto({
      ...meta.value,
      image: imageBytes,
      thumb: thumbBytes,
      mime: imageMime.value,
      width: positiveInt(form.get("width")),
      height: positiveInt(form.get("height")),
      created_by_phone: auth.phone,
    });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    return routeErrorResponse(err, "छायाचित्र अपलोड अयशस्वी");
  }
}
