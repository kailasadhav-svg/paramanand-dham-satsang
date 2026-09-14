import { normalizePhone } from "@/lib/offline/phone";

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

/** कैलास आढाव as चरणसेवक (no software rights on this number). */
export const SEEKER_DEMO_PHONES = (
  process.env.NEXT_PUBLIC_SEEKER_PHONES || "9423078811"
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

export function appDisplayName(role: StaffRole): string {
  if (role === "charansevak") return "परमानंद चरणसेवक";
  if (role === "guru") return "अजपा संवाद";
  return "अजपा संवाद"; // software
}

export function defaultHomePath(role: StaffRole): string {
  return canSeeStaffScreens(role) ? "/attendance" : "/ajapa";
}
