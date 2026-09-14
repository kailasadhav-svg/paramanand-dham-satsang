import { normalizePhone, phonesEqual } from "./phone";
import {
  appDisplayName,
  canSeeSoftwareRights,
  canSeeStaffScreens,
  detectStaffRole,
  type StaffRole,
} from "@/lib/roles";

export type AppRole = StaffRole;

export type LocalProfile = {
  phone: string;
  role: AppRole;
  name?: string;
  updatedAt: string;
};

const KEY = "paramanand_local_profile_v2";

export function detectRole(phone: string): AppRole {
  return detectStaffRole(phone);
}

export function loadProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    // migrate v1 if present
    const raw = localStorage.getItem(KEY) || localStorage.getItem("paramanand_local_profile_v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalProfile & { role?: string };
    if (!p?.phone) return null;
    const phone = normalizePhone(p.phone);
    const role = detectRole(phone);
    const profile: LocalProfile = {
      phone,
      name: p.name,
      role,
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(profile));
    return profile;
  } catch {
    return null;
  }
}

export function saveProfile(input: {
  phone: string;
  name?: string;
}): LocalProfile {
  const phone = normalizePhone(input.phone);
  const role = detectRole(phone);
  const profile: LocalProfile = {
    phone,
    name: input.name?.trim() || undefined,
    role,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem("paramanand_local_profile_v1");
}

export function isOwnQuestion(
  profile: LocalProfile,
  q: { seeker_phone: string },
): boolean {
  if (canSeeStaffScreens(profile.role)) return true;
  return phonesEqual(profile.phone, q.seeker_phone);
}

export function profileAppName(profile: LocalProfile | null): string {
  if (!profile) return "अजपा संवाद";
  return appDisplayName(profile.role);
}

export function profileSeesStaff(profile: LocalProfile | null): boolean {
  return Boolean(profile && canSeeStaffScreens(profile.role));
}

export function profileSeesSoftware(profile: LocalProfile | null): boolean {
  return Boolean(profile && canSeeSoftwareRights(profile.role));
}
