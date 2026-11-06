import { NextResponse } from "next/server";
import { jsonError, requireApiSession, requireActorPhone, routeErrorResponse } from "@/lib/api-guard";
import {
  DUTY_KIND_SATSANG,
  getDuty,
  getMeeting,
  getPlace,
  upsertMeeting,
  type MeetingPatch,
} from "@/lib/db";
import { actorCanEditPlaceTopic, getMeetingTopicLock } from "@/lib/chintan";
import { DEFAULT_MEETING_TIME } from "@/lib/dates";
import {
  ATTENDANCE_GEO_MAX_METERS,
  OFF_SITE_WARNING,
  distanceMeters,
} from "@/lib/geo";
import { SATSANG_CHARANSEVAK_LABEL } from "@/lib/labels";
import { phonesEqual } from "@/lib/offline/phone";
import {
  PLACE_TOPIC_LOCKED_ERROR,
  PRIOR_WEEK_SUMMARY_REQUIRED_ERROR,
  meetingTopicFieldsTouched,
} from "@/lib/topic-lock";
import { canSeeStaffScreens, detectStaffRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const placeId = Number(searchParams.get("place_id"));
  const date = searchParams.get("date");
  if (!placeId || !date) return jsonError("place_id आणि date आवश्यक", 400);
  try {
    const meeting = await getMeeting(placeId, date);
    const place = await getPlace(placeId);
    const lock = place
      ? await getMeetingTopicLock({ placeName: place.name, weekStart: date })
      : {
          topic_locked: false,
          chintan_count: 0,
          prior_week_start: date,
          prior_chintan_count: 0,
          prior_summary_complete: true,
          topic_needs_prior_summary: false,
        };
    return NextResponse.json({
      place,
      topic_locked: lock.topic_locked,
      chintan_count: lock.chintan_count,
      prior_week_start: lock.prior_week_start,
      prior_chintan_count: lock.prior_chintan_count,
      prior_summary_complete: lock.prior_summary_complete,
      topic_needs_prior_summary: lock.topic_needs_prior_summary,
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
        checkin_lat: null,
        checkin_lng: null,
        checkin_accuracy_m: null,
        checkin_distance_m: null,
        checkin_ok: null,
        checkin_phone: null,
        checkin_at: null,
      },
    });
  } catch (err) {
    return routeErrorResponse(err, "उपस्थिती लोड अयशस्वी");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const actor = actorAuth.phone;
  const role = actor ? detectStaffRole(actor) : "charansevak";
  const staff = canSeeStaffScreens(role);

  const body = (await request.json().catch(() => ({}))) as Partial<MeetingPatch> & {
    latitude?: number;
    longitude?: number;
    accuracy_m?: number;
  };

  if (!body.place_id || !body.meeting_date) {
    return jsonError("place_id आणि meeting_date आवश्यक", 400);
  }
  if (!staff) {
    const satsang = await getDuty(
      Number(body.place_id),
      String(body.meeting_date),
      DUTY_KIND_SATSANG,
    );
    if (!actor || !satsang || !phonesEqual(satsang.charansevak_phone, actor)) {
      return jsonError(
        `फक्त या स्थळाचे ${SATSANG_CHARANSEVAK_LABEL} उपस्थिती नोंद करू शकतात`,
        403,
      );
    }
    // Duty assignment is the source of truth — विचार वाहक cannot rename themselves.
    delete body.conductor;
  }
  const kind = body.topic_kind;
  if (kind && kind !== "atmaprabha" && kind !== "upadesh") {
    return jsonError("अवैध विषय प्रकार", 400);
  }

  const place = await getPlace(Number(body.place_id));
  if (!place) return jsonError("स्थान सापडले नाही", 404);

  const topicFieldsTouched = meetingTopicFieldsTouched(body);
  const topicTouched = topicFieldsTouched || body.notes !== undefined;
  const hasGeo =
    Number.isFinite(Number(body.latitude)) &&
    Number.isFinite(Number(body.longitude));

  if (topicTouched) {
    const allowed = actor ? await actorCanEditPlaceTopic(actor) : false;
    if (!allowed) {
      return jsonError("फक्त मार्गदर्शक विषय तयार / दुरुस्त करू शकतात", 403);
    }
  }

  if (topicFieldsTouched) {
    const lock = await getMeetingTopicLock({
      placeName: place.name,
      weekStart: String(body.meeting_date),
    });
    if (lock.topic_locked) {
      return jsonError(PLACE_TOPIC_LOCKED_ERROR, 409);
    }
    if (lock.topic_needs_prior_summary) {
      return jsonError(PRIOR_WEEK_SUMMARY_REQUIRED_ERROR, 409);
    }
  }

  let checkin: Partial<MeetingPatch> = {};

  // चरणसेवक attendance: सत्संग स्थळापासून ≤20m आवश्यक
  if (!staff) {
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonError("उपस्थितीसाठी स्थान (GPS) आवश्यक", 400);
    }
    if (place.latitude == null || place.longitude == null) {
      return jsonError(
        "या ठिकाणाचे GPS अजून सेट नाही — मार्गदर्शक / संगणक प्रथम स्थळ चिन्हांकित करा",
        400,
      );
    }
    const dist = distanceMeters(
      { lat, lng },
      { lat: place.latitude, lng: place.longitude },
    );
    const ok = dist <= ATTENDANCE_GEO_MAX_METERS;
    checkin = {
      checkin_lat: lat,
      checkin_lng: lng,
      checkin_accuracy_m: Number.isFinite(Number(body.accuracy_m))
        ? Number(body.accuracy_m)
        : null,
      checkin_distance_m: Math.round(dist * 10) / 10,
      checkin_ok: ok,
      checkin_phone: actor || null,
      checkin_at: new Date().toISOString(),
    };
    if (!ok) {
      return NextResponse.json(
        {
          error: OFF_SITE_WARNING,
          off_site: true,
          distance_m: checkin.checkin_distance_m,
          max_m: ATTENDANCE_GEO_MAX_METERS,
          checkin,
        },
        { status: 403 },
      );
    }
  } else if (
    Number.isFinite(Number(body.latitude)) &&
    Number.isFinite(Number(body.longitude))
  ) {
    // staff optional check-in log
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    let dist: number | null = null;
    let ok: boolean | null = null;
    if (place.latitude != null && place.longitude != null) {
      dist = distanceMeters(
        { lat, lng },
        { lat: place.latitude, lng: place.longitude },
      );
      ok = dist <= ATTENDANCE_GEO_MAX_METERS;
    }
    checkin = {
      checkin_lat: lat,
      checkin_lng: lng,
      checkin_accuracy_m: Number.isFinite(Number(body.accuracy_m))
        ? Number(body.accuracy_m)
        : null,
      checkin_distance_m: dist == null ? null : Math.round(dist * 10) / 10,
      checkin_ok: ok,
      checkin_phone: actor || null,
      checkin_at: new Date().toISOString(),
    };
  }

  try {
    const meeting = await upsertMeeting({
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
      ...checkin,
    });
    return NextResponse.json({ meeting });
  } catch (err) {
    return routeErrorResponse(err, "उपस्थिती जतन अयशस्वी");
  }
}
