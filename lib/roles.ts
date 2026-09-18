import { isFridayVahakAppointWindow } from "./dates.ts";
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
 * Future (not in this PR): one question/week; village चिंतन PDF; AI-first answers
 * then escalate to मार्गदर्शक; dashboard similar-question counts; rank top 3 चिंतन.
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

/** Attendance + report (+ topic/questions staff tools). */
export function canSeeStaffScreens(role: StaffRole): boolean {
  return role === "software" || role === "guru";
}

export function canSeeSoftwareRights(role: StaffRole): boolean {
  return role === "software";
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
 * Appoint परमानंद विचार वाहक for a place/Thursday.
 * मार्गदर्शक (and संगणक) anytime; सत्संग चरणसेवक only Friday 06:00–12:00 IST
 * when that place still has no वाहक for the week.
 */
export function canAppointVahak(
  role: StaffRole,
  opts: { hasDuty: boolean; now?: Date } = { hasDuty: false },
): boolean {
  if (role === "guru" || role === "software") return true;
  if (role !== "charansevak") return false;
  if (opts.hasDuty) return false;
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
