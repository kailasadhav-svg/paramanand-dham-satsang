import { loadProfile } from "@/lib/offline/profile";

/** Authenticated JSON fetch; attaches actor phone for role checks. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const profile = typeof window !== "undefined" ? loadProfile() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (profile?.phone) headers["x-actor-phone"] = profile.phone;

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `त्रुटी ${res.status}`);
  }
  return data;
}
