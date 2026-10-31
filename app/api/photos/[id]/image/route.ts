import { NextResponse } from "next/server";
import { jsonError, requireApiSession, routeErrorResponse } from "@/lib/api-guard";
import { getPhotoImage } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Uploaded photo bytes. `?size=thumb` serves the grid thumbnail. Needs the app PIN session. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId <= 0) return jsonError("अवैध छायाचित्र", 400);
  const size = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  try {
    const img = await getPhotoImage(photoId, size);
    if (!img) return jsonError("छायाचित्र सापडले नाही", 404);
    return new NextResponse(Buffer.from(img.bytes), {
      headers: {
        "Content-Type": img.mime,
        "Content-Length": String(img.bytes.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return routeErrorResponse(err, "छायाचित्र लोड अयशस्वी");
  }
}
