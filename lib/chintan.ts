import { listDutiesForPhone, getDuty } from "./db";
import { listMembers } from "./members";
import { placeCodeFromDbName, type PlaceCode } from "./places";
import {
  canEditAnyPlaceTopic,
  canEditWeeklyQuestion,
  canSeeChintanBody,
  canSeeGuideScreens,
  detectStaffRole,
  phonesEqual,
} from "./roles";
import { listWeeklyAnswers, getWeeklyQuestion } from "./weekly";
import {
  redactChintanRoster,
  scopeChintanRoster,
  type ChintanStatusRow,
} from "./chintan-roster";

export {
  redactChintanRoster,
  type ChintanStatusRow,
} from "./chintan-roster";

export async function actorIsVahak(
  phone: string,
  date: string,
  placeId?: number,
): Promise<boolean> {
  if (placeId != null) {
    const duty = await getDuty(placeId, date);
    if (!duty) return false;
    return phonesEqual(phone, duty.charansevak_phone);
  }
  const duties = await listDutiesForPhone(phone, date);
  return duties.length > 0;
}

export async function actorCanEditPlaceTopic(
  phone: string,
  placeId: number,
  date: string,
): Promise<boolean> {
  const role = detectStaffRole(phone);
  if (canEditAnyPlaceTopic(role)) return true;
  return actorIsVahak(phone, date, placeId);
}

export async function listChintanRoster(opts: {
  weekStart: string;
  placeCodes?: string[] | null;
}): Promise<ChintanStatusRow[]> {
  const members = await listMembers();
  const question = await getWeeklyQuestion(opts.weekStart);
  const answers = question ? await listWeeklyAnswers(question.id) : [];
  const byId = new Map(answers.map((a) => [a.member_id, a]));
  const raw = members.map((m) => {
    const hit = byId.get(m.id);
    return {
      member_id: m.id,
      member_name: m.name,
      place_code: m.place_code,
      place_label: m.place_label,
      submitted: Boolean(hit?.answer?.trim()),
      answer: hit?.answer,
    };
  });
  return scopeChintanRoster(raw, opts.placeCodes ?? null);
}

export async function chintanViewForActor(opts: {
  phone: string;
  weekStart: string;
}): Promise<{
  can_edit_question: boolean;
  can_see_bodies: boolean;
  is_vahak: boolean;
  vahak_place_ids: number[];
  roster: ChintanStatusRow[];
}> {
  const role = detectStaffRole(opts.phone);
  const guide = canSeeGuideScreens(role);
  const seeBody = canSeeChintanBody(role);
  const duties = await listDutiesForPhone(opts.phone, opts.weekStart);
  const isVahak = duties.length > 0;
  const vahakPlaceIds = duties.map((d) => d.place_id);
  let placeCodes: string[] | null = null;
  if (guide) {
    placeCodes = null;
  } else if (isVahak) {
    placeCodes = duties
      .map((d) => placeCodeFromDbName(d.place_name))
      .filter((c): c is PlaceCode => Boolean(c));
  } else {
    // संगणक and ordinary परमानंद चरणसेवक — no other members’ चिंतन.
    placeCodes = [];
  }
  const raw = await listChintanRoster({
    weekStart: opts.weekStart,
    placeCodes,
  });
  return {
    can_edit_question: canEditWeeklyQuestion(role),
    can_see_bodies: seeBody,
    is_vahak: isVahak,
    vahak_place_ids: vahakPlaceIds,
    roster: redactChintanRoster(raw, seeBody),
  };
}
