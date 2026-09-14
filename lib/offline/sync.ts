import { api } from "@/lib/api";
import type { AjapaQuestion, AjapaStatus } from "@/lib/ajapa/types";
import { getAllQuestions, getMeta, setMeta, upsertQuestions } from "./idb";
import type { LocalProfile } from "./profile";

export type SyncResult = {
  pulled: number;
  localCount: number;
  offline: boolean;
  at: string;
};

export type DialogueScope = {
  place_id: number;
  meeting_date: string;
};

/** Shared संवाद for one place + गुरुवार विषय — सर्वांना त्या स्थळाचे प्रश्न. */
export async function readLocalForDialogue(
  profile: LocalProfile,
  scope: DialogueScope,
): Promise<AjapaQuestion[]> {
  const all = await getAllQuestions();
  let list = all.filter(
    (q) => q.place_id === scope.place_id && q.meeting_date === scope.meeting_date,
  );
  if (profile.role === "guru") {
    list = list.filter((q) => q.status === "escalated" || q.status === "guru_answered");
  }
  return list;
}

/** Pull questions for one place+date संवाद (shared). */
export async function syncAjapaFromServer(
  profile: LocalProfile,
  scope?: DialogueScope,
): Promise<SyncResult> {
  const sinceKey = scope
    ? `ajapa_since_${scope.place_id}_${scope.meeting_date}`
    : "ajapa_since";
  const since = (await getMeta(sinceKey)) || undefined;
  const base = new URLSearchParams();
  base.set("limit", "200");
  if (since) base.set("since", since);
  if (scope) {
    base.set("place_id", String(scope.place_id));
    base.set("meeting_date", scope.meeting_date);
  }

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
    if (latest) await setMeta(sinceKey, latest);
    await setMeta("ajapa_last_sync", new Date().toISOString());

    const local = scope
      ? await readLocalForDialogue(profile, scope)
      : await getAllQuestions();
    return {
      pulled: questions.length,
      localCount: local.length,
      offline: false,
      at: new Date().toISOString(),
    };
  } catch {
    const local = scope
      ? await readLocalForDialogue(profile, scope)
      : await getAllQuestions();
    return {
      pulled: 0,
      localCount: local.length,
      offline: true,
      at: new Date().toISOString(),
    };
  }
}

/** @deprecated use readLocalForDialogue */
export async function readLocalForProfile(
  profile: LocalProfile,
): Promise<AjapaQuestion[]> {
  void profile;
  return getAllQuestions();
}
