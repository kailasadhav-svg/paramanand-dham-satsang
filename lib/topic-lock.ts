import { canonicalizePlaceCode, parsePlaceInput } from "./places.ts";

/** Server + UI: first submitted चिंतन for that गाव+week freezes विषय. */
export const PLACE_TOPIC_LOCKED_ERROR =
  "या गावाचे चिंतन आले आहे; विषय आता बदलता येणार नाही.";

export type PlaceChintanAnswer = {
  place_code?: string | null;
  answer?: string | null;
};

/** Normalize stored/DB place codes so ambashi and शिंदी count as the same गाव. */
export function topicLockPlaceCode(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return canonicalizePlaceCode(raw) ?? parsePlaceInput(raw) ?? raw.toLowerCase();
}

export function isNonEmptyChintan(answer: string | null | undefined): boolean {
  return Boolean(answer?.trim());
}

/** Count non-empty weekly_answers for members of this गाव. */
export function countPlaceChintan(
  answers: PlaceChintanAnswer[],
  placeCode: string,
): number {
  const want = topicLockPlaceCode(placeCode);
  if (!want) return 0;
  return answers.filter(
    (row) =>
      topicLockPlaceCode(row.place_code) === want && isNonEmptyChintan(row.answer),
  ).length;
}

export function isPlaceTopicLocked(chintanCount: number): boolean {
  return chintanCount >= 1;
}

export function placeTopicLockState(
  answers: PlaceChintanAnswer[],
  placeCode: string,
): { topic_locked: boolean; chintan_count: number } {
  const chintan_count = countPlaceChintan(answers, placeCode);
  return {
    topic_locked: isPlaceTopicLocked(chintan_count),
    chintan_count,
  };
}

export function meetingTopicFieldsTouched(body: {
  topic_kind?: unknown;
  topic_title?: unknown;
}): boolean {
  return body.topic_kind !== undefined || body.topic_title !== undefined;
}
