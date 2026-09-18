import { NextResponse } from "next/server";
import {
  jsonError,
  requireActorPhone,
  requireGuideActor,
  routeErrorResponse,
} from "@/lib/api-guard";
import { actorIsVahak, chintanViewForActor, listChintanRoster } from "@/lib/chintan";
import { groupChintanByVillage } from "@/lib/chintan-roster";
import {
  addDaysYmd,
  archiveSourceWeekStart,
  defaultThursdayYmd,
  isAtOrAfterThursdayArchiveTime,
} from "@/lib/dates";
import { listQuestions } from "@/lib/db";
import { WEEKLY_ARCHIVE_HELP } from "@/lib/labels";
import { placeCodeFromDbName } from "@/lib/places";
import { assignPublicQuestionIds } from "@/lib/question-id";
import { canSeeGuideScreens, detectStaffRole } from "@/lib/roles";
import {
  ArchiveError,
  applyArchiveAckRead,
  applyArchiveShare,
  applyArchiveSummary,
  applyArchiveVisibility,
  buildVillageArchives,
  filterArchivesForActor,
  listStoredArchives,
  mutateStoredArchive,
  upsertGeneratedArchives,
  type ArchiveSummaryKind,
} from "@/lib/weekly-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function weekParam(raw: string | null): string | null {
  const v = raw || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

export async function GET(request: Request) {
  const actorAuth = await requireActorPhone();
  if (!actorAuth.ok) return actorAuth.response;
  const { searchParams } = new URL(request.url);
  const thisThursday =
    weekParam(searchParams.get("this_thursday")) || defaultThursdayYmd();
  const weekStart =
    weekParam(searchParams.get("week_start")) || archiveSourceWeekStart(thisThursday);
  const role = detectStaffRole(actorAuth.phone);
  const guide = canSeeGuideScreens(role);
  const isVahak = await actorIsVahak(actorAuth.phone, weekStart);
  if (!guide && !isVahak) {
    return jsonError("फक्त मार्गदर्शक / विचार वाहक", 403);
  }
  try {
    const all = listStoredArchives(weekStart);
    const view = await chintanViewForActor({
      phone: actorAuth.phone,
      weekStart,
    });
    const codes = view.roster.map((r) => r.place_code).filter(Boolean);
    const archives = filterArchivesForActor(all, {
      guide,
      vahakPlaceCodes: codes,
    });
    return NextResponse.json({
      todo: true,
      message: WEEKLY_ARCHIVE_HELP,
      this_thursday: thisThursday,
      week_start: weekStart,
      due: isAtOrAfterThursdayArchiveTime(thisThursday),
      archives,
    });
  } catch (err) {
    return routeErrorResponse(err, "संग्रह लोड अयशस्वी");
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    this_thursday?: string;
    week_start?: string;
    place_code?: string;
    visible?: boolean;
    share_to_village_admin?: boolean;
    kind?: ArchiveSummaryKind;
    text?: string;
    filename?: string;
  };
  const action = body.action || "generate";
  const thisThursday =
    weekParam(body.this_thursday || null) || defaultThursdayYmd();
  const weekStart =
    weekParam(body.week_start || null) || archiveSourceWeekStart(thisThursday);

  try {
    if (action === "ack_read") {
      const actorAuth = await requireActorPhone();
      if (!actorAuth.ok) return actorAuth.response;
      const guide = canSeeGuideScreens(detectStaffRole(actorAuth.phone));
      const isVahak = await actorIsVahak(actorAuth.phone, weekStart);
      if (!guide && !isVahak) return jsonError("फक्त मार्गदर्शक / विचार वाहक", 403);
      if (!body.place_code) return jsonError("गाव आवश्यक", 400);
      const archive = mutateStoredArchive(weekStart, body.place_code, applyArchiveAckRead);
      return NextResponse.json({ todo: true, archive });
    }

    const auth = await requireGuideActor();
    if (!auth.ok) return auth.response;

    if (action === "generate") {
      const villages = groupChintanByVillage(
        await listChintanRoster({ weekStart, placeCodes: null }),
      );
      const raw = await listQuestions({
        from: weekStart,
        to: addDaysYmd(weekStart, 6),
      });
      const numbered = assignPublicQuestionIds(raw);
      const questions = numbered.map((q) => ({
        place_code: placeCodeFromDbName(q.place_name || "") || "unknown",
        question: q.question,
        answer: q.answer,
        public_id: q.public_id,
      }));
      const built = buildVillageArchives({
        weekStart,
        generatedAt: new Date().toISOString(),
        villages,
        questions,
      });
      const archives = upsertGeneratedArchives(built);
      return NextResponse.json({
        todo: true,
        message: WEEKLY_ARCHIVE_HELP,
        week_start: weekStart,
        due: isAtOrAfterThursdayArchiveTime(thisThursday),
        archives,
      });
    }

    if (!body.place_code) return jsonError("गाव आवश्यक", 400);

    if (action === "summary") {
      const archive = mutateStoredArchive(weekStart, body.place_code, (row) =>
        applyArchiveSummary(row, {
          kind: body.kind || "text",
          text: body.text,
          filename: body.filename,
        }),
      );
      return NextResponse.json({ todo: true, archive });
    }
    if (action === "visibility") {
      const archive = mutateStoredArchive(weekStart, body.place_code, (row) =>
        applyArchiveVisibility(row, Boolean(body.visible)),
      );
      return NextResponse.json({ todo: true, archive });
    }
    if (action === "share") {
      const archive = mutateStoredArchive(weekStart, body.place_code, (row) =>
        applyArchiveShare(row, Boolean(body.share_to_village_admin)),
      );
      return NextResponse.json({ todo: true, archive });
    }
    return jsonError("अवैध क्रिया", 400);
  } catch (err) {
    if (err instanceof ArchiveError) return jsonError(err.message, err.status);
    return routeErrorResponse(err, "संग्रह अयशस्वी");
  }
}
