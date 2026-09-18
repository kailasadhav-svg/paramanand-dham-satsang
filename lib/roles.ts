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
 * Future (not built here) — मार्गदर्शक product powers:
 * - all member questions route to मार्गदर्शक; dashboard total + एकसमान count;
 *   one shared answer for similars OR per-person answers
 * - rank top 3 submitted चिंतन (क्रमवार योग्य तीन)
 * - same Thursday topic for all villages OR different per village
 * - one question per परमानंद चरणसेवक per week (hard limit); चिंतन mandatory
 * - village-wise combined चिंतन PDF; AI answer first, then escalate if unsatisfied
 * - question id = village + week number + sequence; process FIFO
 * - मार्गदर्शक may upload handwritten-answer photo
 * - week 1 = first Thursday of Jan 2026 (2026-01-01); later Thursdays +1 in-year
 * - Thursday screens: Marathi panchang tithi in the top area
 * - Thursday 17:00: previous week’s immutable per-village चिंतन + प्रश्न-उत्तर
 *   files (मार्गदर्शक owns; no edits after generate). Optional visibility to
 *   that Thursday’s विचार वाहक. Mandatory summary on the चिंतन file (type /
 *   photo / voice). Previous वाहक must read or play that summary at the place.
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
