import { getDb } from "./db.ts";
import { thursdayContainingYmd, weekFromThursday } from "./dates.ts";
import { ONE_QUESTION_HELP } from "./labels.ts";
import { normalizePhone } from "./offline/phone.ts";
import { canSeeGuideScreens, detectStaffRole } from "./roles.ts";

export { ONE_QUESTION_HELP };

/** मार्गदर्शक may ask more than one; everyone else: hard limit of 1 / week. */
export function actorNeedsWeeklyQuestionLimit(phone: string): boolean {
  return !canSeeGuideScreens(detectStaffRole(phone));
}

function phoneVariants(phone: string): [string, string] {
  const n = normalizePhone(phone);
  const last10 = n.slice(-10);
  return [n, last10];
}

/** True if this seeker already asked a village or अजपा question this Thursday week. */
export async function seekerHasQuestionThisWeek(
  phone: string,
  aroundYmd: string,
): Promise<boolean> {
  const week = weekFromThursday(thursdayContainingYmd(aroundYmd));
  const [full, last10] = phoneVariants(phone);
  const db = await getDb();
  const village = await db.execute({
    sql: `SELECT id FROM questions
      WHERE asked_on >= ? AND asked_on <= ?
        AND asked_by_phone IS NOT NULL
        AND (asked_by_phone = ? OR asked_by_phone = ? OR asked_by_phone LIKE '%' || ?)
      LIMIT 1`,
    args: [week.start, week.end, full, last10, last10],
  });
  if (village.rows.length) return true;
  const ajapa = await db.execute({
    sql: `SELECT id FROM ajapa_questions
      WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?
        AND (seeker_phone = ? OR seeker_phone = ? OR seeker_phone LIKE '%' || ?)
      LIMIT 1`,
    args: [week.start, week.end, full, last10, last10],
  });
  return ajapa.rows.length > 0;
}
