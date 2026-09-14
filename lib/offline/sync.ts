import { api } from "@/lib/api";
import type { AjapaQuestion, AjapaStatus } from "@/lib/ajapa/types";
import { getAllQuestions, getMeta, setMeta, upsertQuestions } from "./idb";
import { phonesEqual } from "./phone";
import type { LocalProfile } from "./profile";
import { canSeeStaffScreens } from "@/lib/roles";

export type SyncResult = {
  pulled: number;
  localCount: number;
  offline: boolean;
  at: string;
};

function filterForRole(profile: LocalProfile, questions: AjapaQuestion[]): AjapaQuestion[] {
  if (canSeeStaffScreens(profile.role)) {
    if (profile.role === "guru") {
      return questions.filter((q) => q.status === "escalated" || q.status === "guru_answered");
    }
    return questions; // software / संचालक
  }
  return questions.filter((q) => phonesEqual(q.seeker_phone, profile.phone));
}

export async function readLocalForProfile(profile: LocalProfile): Promise<AjapaQuestion[]> {
  return filterForRole(profile, await getAllQuestions());
}

/** Pull deltas since last sync — keeps server load low. */
export async function syncAjapaFromServer(profile: LocalProfile): Promise<SyncResult> {
  const since = (await getMeta("ajapa_since")) || undefined;
  const base = new URLSearchParams();
  base.set("limit", "200");
  if (since) base.set("since", since);
  if (profile.role === "charansevak") base.set("seeker_phone", profile.phone);

  try {
    let questions: AjapaQuestion[] = [];
    if (profile.role === "guru") {
      for (const status of ["escalated", "guru_answered"] as AjapaStatus[]) {
        const q = new URLSearchParams(base);
        q.set("status", status);
        const data = await api<{ questions: AjapaQuestion[] }>(
          `/api/ajapa/questions?${q.toString()}`,
        );
        questions = questions.concat(data.questions);
      }
      questions = [...new Map(questions.map((x) => [x.id, x])).values()];
    } else {
      const data = await api<{ questions: AjapaQuestion[] }>(
        `/api/ajapa/questions?${base.toString()}`,
      );
      questions = data.questions;
    }

    await upsertQuestions(questions);
    const latest = questions.reduce(
      (max, q) => (q.updated_at > max ? q.updated_at : max),
      since || "",
    );
    if (latest) await setMeta("ajapa_since", latest);
    await setMeta("ajapa_last_sync", new Date().toISOString());

    const local = await readLocalForProfile(profile);
    return {
      pulled: questions.length,
      localCount: local.length,
      offline: false,
      at: new Date().toISOString(),
    };
  } catch {
    const local = await readLocalForProfile(profile);
    return {
      pulled: 0,
      localCount: local.length,
      offline: true,
      at: new Date().toISOString(),
    };
  }
}
