import { normalizePhone } from "./offline/phone.ts";

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
 * Only संवादक (मधुसुदनदास / super-admin — `guru` role) may approve.
 * चरणसेवक admin must not appoint; there is no recommend-vs-approve queue.
 */
export function canApproveCharansevak(role: StaffRole): boolean {
  return role === "guru";
}

/** @deprecated Use canApproveCharansevak — same guru-only rule. */
export function canAppointSatsangi(role: StaffRole): boolean {
  return canApproveCharansevak(role);
}

export function appDisplayName(role: StaffRole): string {
  if (role === "charansevak") return "परमानंद चरणसेवक";
  if (role === "guru") return "अजपा संवाद";
  return "परमानंद सेवक";
}

/** User-facing role name (गुरु → संवादक). */
export function roleLabelMarathi(role: StaffRole): string {
  if (role === "software") return "सेवक";
  if (role === "guru") return "संवादक";
  return "चरणसेवक";
}

export function defaultHomePath(role: StaffRole): string {
  return canSeeStaffScreens(role) ? "/attendance" : "/ajapa";
}
