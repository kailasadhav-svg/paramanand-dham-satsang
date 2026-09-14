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

/**
 * Staff चरणसेवक phones (appoint + assign conductor):
 * - 9423078811 कैलास आढाव
 * - 9136443333 मधुसुदनदास
 * Everyone else with a member row (or join-link) is सत्संगी चरणसेवक.
 */
export const STAFF_CHARANSEVAK_PHONES = (
  process.env.NEXT_PUBLIC_SEEKER_PHONES || "9423078811,9136443333"
)
  .split(",")
  .map((p) => normalizePhone(p.trim()))
  .filter(Boolean);

/** @deprecated use STAFF_CHARANSEVAK_PHONES */
export const SEEKER_DEMO_PHONES = STAFF_CHARANSEVAK_PHONES;

/**
 * - software = संचालक
 * - guru = संवादक
 * - charansevak = staff चरणसेवक (appointing trio)
 * - satsangi = सत्संगी चरणसेवक (self-attendance + weekly opinion)
 */
export type StaffRole = "software" | "guru" | "charansevak" | "satsangi";
export type AppRole = StaffRole;

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

export function isStaffCharansevakPhone(phone: string): boolean {
  const n = normalizePhone(phone);
  return STAFF_CHARANSEVAK_PHONES.some((p) => p === n);
}

export function isSeekerDemoPhone(phone: string): boolean {
  return isStaffCharansevakPhone(phone);
}

export function detectStaffRole(phone: string): StaffRole {
  if (isSoftwarePhone(phone)) return "software";
  if (isGuruPhone(phone)) return "guru";
  if (isStaffCharansevakPhone(phone)) return "charansevak";
  return "satsangi";
}

/** विषय / प्रश्न / अहवाल / स्थळ GPS — संचालक + संवादक */
export function canSeeStaffScreens(role: StaffRole): boolean {
  return role === "software" || role === "guru";
}

export function canSeeSoftwareRights(role: StaffRole): boolean {
  return role === "software";
}

/** नवीन सत्संगी नेमणूक + संचालन नेमणूक — तिन्ही जबाबदाऱ्या */
export function canAppointSatsangi(role: StaffRole): boolean {
  return role === "software" || role === "guru" || role === "charansevak";
}

export function canAssignConductor(role: StaffRole): boolean {
  return canAppointSatsangi(role);
}

export function appDisplayName(role: StaffRole): string {
  if (role === "satsangi") return "सत्संगी चरणसेवक";
  if (role === "charansevak") return "परमानंद चरणसेवक";
  if (role === "guru") return "अजपा संवाद";
  return "परमानंद संचालक";
}

export function roleLabelMarathi(role: StaffRole): string {
  if (role === "software") return "संचालक";
  if (role === "guru") return "संवादक";
  if (role === "charansevak") return "चरणसेवक";
  return "सत्संगी चरणसेवक";
}

export function defaultHomePath(role: StaffRole): string {
  if (role === "software" || role === "guru" || role === "charansevak") {
    return "/attendance";
  }
  return "/attendance";
}
