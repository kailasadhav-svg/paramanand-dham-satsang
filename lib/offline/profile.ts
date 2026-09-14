import { normalizePhone, phonesEqual } from "./phone";

export type AppRole = "charansevak" | "guru" | "admin";

export type LocalProfile = {
  phone: string;
  role: AppRole;
  name?: string;
  updatedAt: string;
};

const KEY = "paramanand_local_profile_v1";

function guruPhones(): string[] {
  const env =
    process.env.NEXT_PUBLIC_GURU_PHONES ||
    process.env.NEXT_PUBLIC_GURU_PHONE ||
    "9850120960";
  return env
    .split(",")
    .map((p) => normalizePhone(p.trim()))
    .filter(Boolean);
}

export function detectRole(phone: string): AppRole {
  const n = normalizePhone(phone);
  if (guruPhones().some((g) => g === n)) return "guru";
  return "charansevak";
}

export function loadProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalProfile;
    if (!p?.phone) return null;
    return {
      ...p,
      phone: normalizePhone(p.phone),
      role: p.role === "admin" ? "admin" : detectRole(p.phone),
    };
  } catch {
    return null;
  }
}

export function saveProfile(input: {
  phone: string;
  name?: string;
  role?: AppRole;
}): LocalProfile {
  const phone = normalizePhone(input.phone);
  const profile: LocalProfile = {
    phone,
    name: input.name?.trim() || undefined,
    role: input.role === "admin" ? "admin" : detectRole(phone),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

export function isOwnQuestion(
  profile: LocalProfile,
  q: { seeker_phone: string },
): boolean {
  if (profile.role === "admin") return true;
  if (profile.role === "charansevak") return phonesEqual(profile.phone, q.seeker_phone);
  return true;
}
