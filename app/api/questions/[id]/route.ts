import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { deleteQuestion, updateQuestion } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    answer?: string | null;
    answered_by?: "atmaprabha" | "madhusudandas" | null;
    place_id?: number | null;
  };
  if (body.answered_by && !["atmaprabha", "madhusudandas"].includes(body.answered_by)) {
    return jsonError("अवैध उत्तर स्रोत", 400);
  }
  const question = updateQuestion(Number(id), body);
  if (!question) return jsonError("प्रश्न सापडला नाही", 404);
  return NextResponse.json({ question });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const ok = deleteQuestion(Number(id));
  if (!ok) return jsonError("प्रश्न सापडला नाही", 404);
  return NextResponse.json({ ok: true });
}
