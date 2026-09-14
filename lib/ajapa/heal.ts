import { getDb } from "@/lib/db";
import { needsAnswerPolish, polishSeekerAnswer } from "./polish";
import { updateAjapaAiAnswer } from "./store";
import type { AjapaQuestion } from "./types";

function nowIso() {
  return new Date().toISOString();
}

async function fillWeeklyAnswerIfEmpty(question: string, answer: string) {
  try {
    const db = await getDb();
    await db.execute({
      sql: `UPDATE questions
        SET answer = ?, answered_by = 'atmaprabha', updated_at = ?
        WHERE lower(trim(question)) = lower(trim(?))
          AND (answer IS NULL OR trim(answer) = '')`,
      args: [polishSeekerAnswer(answer).slice(0, 12000), nowIso(), question.trim()],
    });
  } catch {
    /* non-fatal */
  }
}

/** Fix already-stored answers that still show 【】 / ## / `1` दाबून. */
export async function healAjapaAnswers(
  questions: AjapaQuestion[],
): Promise<AjapaQuestion[]> {
  const out: AjapaQuestion[] = [];
  for (const q of questions) {
    let next = q;
    if (needsAnswerPolish(q.ai_answer)) {
      const cleaned = polishSeekerAnswer(q.ai_answer || "");
      try {
        next = (await updateAjapaAiAnswer(q.id, cleaned)) ?? {
          ...q,
          ai_answer: cleaned,
        };
      } catch {
        next = { ...q, ai_answer: cleaned };
      }
    }
    if (next.ai_answer) {
      await fillWeeklyAnswerIfEmpty(next.question, next.ai_answer);
    }
    out.push(next);
  }
  return out;
}
