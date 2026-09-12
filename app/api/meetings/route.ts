import { NextResponse } from "next/server";
import { jsonError, requireApiSession } from "@/lib/api-guard";
import { getMeeting, upsertMeeting, type MeetingPatch } from "@/lib/db";
import { DEFAULT_MEETING_TIME } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const placeId = Number(searchParams.get("place_id"));
  const date = searchParams.get("date");
  if (!placeId || !date) return jsonError("place_id आणि date आवश्यक", 400);
  const meeting = getMeeting(placeId, date);
  return NextResponse.json({
    meeting: meeting ?? {
      place_id: placeId,
      meeting_date: date,
      meeting_time: DEFAULT_MEETING_TIME,
      men: 0,
      women: 0,
      children: 0,
      topic_kind: null,
      topic_title: null,
      conductor: null,
      notes: null,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Partial<MeetingPatch>;
  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }
  const kind = body.topic_kind;
  if (kind && kind !== "atmaprabha" && kind !== "upadesh") {
    return jsonError("अवैध विषय प्रकार", 400);
  }
  const meeting = upsertMeeting({
    place_id: Number(body.place_id),
    meeting_date: String(body.meeting_date),
    meeting_time: body.meeting_time,
    men: body.men,
    women: body.women,
    children: body.children,
    topic_kind: body.topic_kind,
    topic_title: body.topic_title,
    conductor: body.conductor,
    notes: body.notes,
  });
  return NextResponse.json({ meeting });
}
