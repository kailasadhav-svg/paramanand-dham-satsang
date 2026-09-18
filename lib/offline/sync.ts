import { api } from "@/lib/api";
import type { AjapaQuestion, AjapaStatus } from "@/lib/ajapa/types";
import { getAllQuestions, getMeta, setMeta, upsertQuestions } from "./idb";
import { phonesEqual } from "./phone";
import type { LocalProfile } from "./profile";
import { canSeeAllAjapa } from "@/lib/roles";

export type SyncResult = {
  pulled: number;
  localCount: number;
  offline: boolean;
  mirrored?: number;
  at: string;
};

function sinceKey(profile: LocalProfile): string {
  return `ajapa_since:${profile.phone}`;
}

function filterForRole(profile: LocalProfile, questions: AjapaQuestion[]): AjapaQuestion[] {
  if (canSeeAllAjapa(profile.role)) {
    return questions.filter((q) => q.status === "escalated" || q.status === "guru_answered");
  }
  return questions.filter((q) => phonesEqual(q.seeker_phone, profile.phone));
}

export async function readLocalForProfile(profile: LocalProfile): Promise<AjapaQuestion[]> {
  return filterForRole(profile, await getAllQuestions());
}

/** Pull deltas since last sync — keeps server load low. */
export async function syncAjapaFromServer(profile: LocalProfile): Promise<SyncResult> {
  const since = (await getMeta(sinceKey(profile))) || undefined;
  const base = new URLSearchParams();
  base.set("limit", "200");
  if (since) base.set("since", since);
  if (profile.role === "charansevak") {
    base.set("seeker_phone", profile.phone);
    // First / legacy weekly questions often lack asked_by_phone — claim them.
    base.set("claim_orphans", "1");
  }

  try {
    let questions: AjapaQuestion[] = [];
    let mirrored = 0;
    if (profile.role === "guru") {
      for (const status of ["escalated", "guru_answered"] as AjapaStatus[]) {
        const q = new URLSearchParams(base);
        q.set("status", status);
        const data = await api<{ questions: AjapaQuestion[]; mirrored?: number }>(
          `/api/ajapa/questions?${q.toString()}`,
        );
        questions = questions.concat(data.questions);
        mirrored += data.mirrored || 0;
      }
      questions = [...new Map(questions.map((x) => [x.id, x])).values()];
    } else {
      const data = await api<{ questions: AjapaQuestion[]; mirrored?: number }>(
        `/api/ajapa/questions?${base.toString()}`,
      );
      questions = data.questions;
      mirrored = data.mirrored || 0;
    }

    await upsertQuestions(questions);
    const latest = questions.reduce(
      (max, q) => (q.updated_at > max ? q.updated_at : max),
      since || "",
    );
    if (latest) await setMeta(sinceKey(profile), latest);
    await setMeta("ajapa_last_sync", new Date().toISOString());

    const local = await readLocalForProfile(profile);
    return {
      pulled: questions.length,
      localCount: local.length,
      mirrored,
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
