import { loadProfile } from "@/lib/offline/profile";

/** Authenticated JSON fetch. Actor identity comes from signed cookie, not headers. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    off_site?: boolean;
  };
  if (!res.ok) {
    throw new Error(data.error || `त्रुटी ${res.status}`);
  }
  return data;
}
