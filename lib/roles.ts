import { isFridayVahakAppointWindow, isFridayVahakAppointWindowForWeek } from "./dates.ts";
import { normalizePhone } from "./offline/phone.ts";
import {
  GUIDE_LABEL,
  MEMBER_ROLE_LABEL,
  SOFTWARE_LABEL,
} from "./labels.ts";

/** Locked phone → role map (KAILAS / मधुसुदनदास). */
export const SOFTWARE_PHONES = (
  process.env.NEXT_PUBLIC_SOFTWARE_PHONES ||
  process.env.NEXT_PUBLIC_SOFTWARE_PHONE ||
  "9225118811"
)
  .split(",")
  .map((p) => normalizePhone(p.trim()))
  .filter(Boolean);

export const GURU_PHONES = (
  process.env.NEXT_PUBLIC_GURU_PHONES ||
  process.env.NEXT_PUBLIC_GURU_PHONE ||
  process.env.GURU_PHONE ||
  "9850120960"
)
  .split(",")
  .map((p) => normalizePhone(p.trim()))
  .filter(Boolean);

/**
 * चरणसेवक demo phones (no software UI):
 * - 9423078811 कैलास आढाव
 * - 9136443333 मधुसुदनदास (भेद नसेल म्हणून स्वतःही चरणसेवक)
 */
export const SEEKER_DEMO_PHONES = (
  process.env.NEXT_PUBLIC_SEEKER_PHONES || "9423078811,9136443333"
)
  .split(",")
  .map((p) => normalizePhone(p.trim()))
  .filter(Boolean);

/**
 * Official display roles (StaffRole remains software|guru|charansevak):
 * - परमानंद चरणसेवक — base for everyone (`charansevak`)
 * - सत्संग चरणसेवक — attendance / satsang recording (+ Friday Vahak appoint window)
 * - परमानंद विचार वाहक — weekly place duty, not a separate login class
 * - संगणक चरणसेवक — software (KAILAS)
 * - मार्गदर्शक चरणसेवक — Madhusudandas: topics, all चिंतन, approve app access, appoint Vahak
 *
 * मार्गदर्शक product powers (see labels.GUIDE_*_HELP; shown on guru screens):
 * 1. All member questions route to them (अजपा / प्रश्नोत्तर inbox).
 * 2. Dashboard: total questions + एकसमान (similar/duplicate) count; answer
 *    similars with ONE shared answer OR per-person answers. (count/shared TBD)
 * 3. From submitted चिंतन: pick/rank क्रमवार योग्य तीन. (rank UI TBD)
 * 4. Topic authority: same topic for all villages OR different per village.
 *    (per-village save exists; same-for-all bulk TBD)
 *
 * Also specified:
 * - One question per परमानंद चरणसेवक per week (hard limit; see weekly-limits).
 * - चिंतन mandatory for everyone (copy + empty submit rejected).
 * - Village-wise combined चिंतन PDF: JSON stub GET /api/weekly/chintan-pdf (TODO renderer).
 * - Every question gets automatic AI / साहित्य answer first; escalate to
 *   मार्गदर्शक if unsatisfied (अजपा OTP flow).
 * - Question id = village+year-week+seq FIFO (`lib/question-id.ts`; not persisted).
 * - मार्गदर्शक handwritten-answer photo: POST /api/questions/[id]/handwritten stub.
 * - Week 1 = first Thursday 2026-01-01; later Thursdays +1 within the year.
 * - Thursday screens: Marathi panchang tithi top bar (stub).
 * - Thursday 17:00 previous-week immutable चिंतन + प्रश्न-उत्तर archive
 *   (GET/POST /api/weekly/archive stub). मार्गदर्शक owns; summary mandatory
 *   (type/photo/voice) before visible; previous विचार वाहक must read/play.
 */
export type StaffRole = "software" | "guru" | "charansevak";

export function phonesEqual(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function isSoftwarePhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return SOFTWARE_PHONES.some((p) => p === n);
}

export function isGuruPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return GURU_PHONES.some((p) => p === n);
}

export function isSeekerDemoPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return SEEKER_DEMO_PHONES.some((p) => p === n);
}

export function detectStaffRole(phone: string): StaffRole {
  if (isSoftwarePhone(phone)) return "software";
  if (isGuruPhone(phone)) return "guru";
  // 9423078811 and all other numbers → चरणसेवक (no software UI)
  return "charansevak";
}

/** Attendance GPS/report staff tools — संगणक + मार्गदर्शक. Not चिंतन / members / Vahak. */
export function canSeeStaffScreens(role: StaffRole): boolean {
  return role === "software" || role === "guru";
}

export function canSeeSoftwareRights(role: StaffRole): boolean {
  return role === "software";
}

/**
 * मार्गदर्शक-only screens/data: weekly topic, all चिंतन bodies, member
 * approval, Vahak appoint, all-seeker अजपा.
 * संगणक must not see these.
 */
export function canSeeGuideScreens(role: StaffRole): boolean {
  return role === "guru";
}

export function canEditWeeklyQuestion(role: StaffRole): boolean {
  return canSeeGuideScreens(role);
}

export function canSeeAllAjapa(role: StaffRole): boolean {
  return canSeeGuideScreens(role);
}

export function canEditAnyPlaceTopic(role: StaffRole): boolean {
  return canSeeGuideScreens(role);
}

/**
 * App access / appoint परमानंद चरणसेवक into the system.
 * Only मार्गदर्शक चरणसेवक (मधुसुदनदास / super-admin — `guru` role) may approve.
 * सत्संग चरणसेवक must not appoint members; there is no recommend-vs-approve queue.
 */
export function canApproveCharansevak(role: StaffRole): boolean {
  return role === "guru";
}

/** Full member चिंतन text — only मार्गदर्शक / मधुसुदनदास. */
export function canSeeChintanBody(role: StaffRole): boolean {
  return role === "guru";
}

/**
 * Appoint परमानंद विचार वाहक for a place/Thursday (always a परमानंद चरणसेवक).
 * Cascade:
 * 1. मार्गदर्शक (मधुसुदनदास) — main weekly duty, anytime.
 * 2. Else सत्संग चरणसेवक — only that week’s Friday 06:00–12:00 IST, empty slot.
 * 3. Else after Friday noon — previous Thursday’s वाहक auto-continues (see dates.shouldAutoContinueVahak).
 * संगणक does not appoint — that screen is मार्गदर्शक / सत्संग चरणसेवक only.
 */
export function canAppointVahak(
  role: StaffRole,
  opts: { hasDuty: boolean; now?: Date; meetingDate?: string } = { hasDuty: false },
): boolean {
  if (canSeeGuideScreens(role)) return true;
  if (role !== "charansevak") return false;
  if (opts.hasDuty) return false;
  if (opts.meetingDate) {
    return isFridayVahakAppointWindowForWeek(opts.meetingDate, opts.now);
  }
  return isFridayVahakAppointWindow(opts.now);
}

/** @deprecated Use canApproveCharansevak — same guru-only rule. */
export function canAppointSatsangi(role: StaffRole): boolean {
  return canApproveCharansevak(role);
}

export function appDisplayName(role: StaffRole): string {
  if (role === "charansevak") return MEMBER_ROLE_LABEL;
  if (role === "guru") return GUIDE_LABEL;
  return SOFTWARE_LABEL;
}

/** Short chip label. */
export function roleLabelMarathi(role: StaffRole): string {
  if (role === "software") return "संगणक";
  if (role === "guru") return "मार्गदर्शक";
  return "चरणसेवक";
}

export function defaultHomePath(role: StaffRole): string {
  return canSeeStaffScreens(role) ? "/attendance" : "/ajapa";
}
