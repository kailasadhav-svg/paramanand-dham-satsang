import { satsangWeekNumber, thursdayContainingYmd } from "./dates.ts";
import { QUESTION_ID_HELP } from "./labels.ts";
import { placeCodeFromDbName } from "./places.ts";

export { QUESTION_ID_HELP };

export type QuestionIdInput = {
  id: number;
  asked_on: string;
  created_at: string;
  place_name?: string | null;
};

/**
 * Public id = village code + year + week + FIFO sequence.
 * Example: nashik-2026w38-001
 * TODO: persist on insert (questions.public_id) so unanswered filters keep seq.
 */
export function formatPublicQuestionId(
  placeCode: string,
  year: number,
  week: number,
  seq: number,
): string {
  const resolved = placeCodeFromDbName(placeCode) || placeCode;
  const place = (resolved || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "") || "unknown";
  const w = String(week).padStart(2, "0");
  const s = String(Math.max(1, seq)).padStart(3, "0");
  return `${place}-${year}w${w}-${s}`;
}

export type QuestionWithPublicId<T> = T & {
  public_id: string;
  fifo_seq: number;
  satsang_year: number | null;
  satsang_week: number | null;
};

function placeCodeFor(name: string | null | undefined): string {
  if (!name?.trim()) return "unknown";
  return placeCodeFromDbName(name) || "unknown";
}

function fifoKey(a: QuestionIdInput, b: QuestionIdInput): number {
  const c = a.created_at.localeCompare(b.created_at);
  if (c !== 0) return c;
  return a.id - b.id;
}

/** Assign village+week+seq in arrival order (FIFO). Does not persist. */
export function assignPublicQuestionIds<T extends QuestionIdInput>(
  rows: T[],
): QuestionWithPublicId<T>[] {
  const sorted = [...rows].sort(fifoKey);
  const counters = new Map<string, number>();
  const byId = new Map<number, QuestionWithPublicId<T>>();
  for (const row of sorted) {
    const th = thursdayContainingYmd(row.asked_on);
    const week = satsangWeekNumber(th);
    const place = placeCodeFor(row.place_name);
    const bucket = week ? `${place}-${week.year}-w${week.week}` : `${place}-none`;
    const seq = (counters.get(bucket) || 0) + 1;
    counters.set(bucket, seq);
    byId.set(row.id, {
      ...row,
      public_id: week
        ? formatPublicQuestionId(place, week.year, week.week, seq)
        : formatPublicQuestionId(place, 0, 0, seq),
      fifo_seq: seq,
      satsang_year: week?.year ?? null,
      satsang_week: week?.week ?? null,
    });
  }
  return sorted.map((row) => byId.get(row.id)!);
}
