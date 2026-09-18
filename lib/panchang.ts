import {
  formatMarathiDate,
  satsangWeekNumber,
  thursdayContainingYmd,
} from "./dates.ts";
import { PANCHANG_TITHI_HELP } from "./labels.ts";

export { PANCHANG_TITHI_HELP };

/**
 * TODO: live Marathi panchang tithi (tithi / paksha / masa) for that Thursday.
 * Until a panchang source is wired, this is a labeled stub plus week number.
 */
export function panchangTithiStub(ymd: string): {
  todo: true;
  thursday: string;
  tithi: string;
  week_label: string;
  line: string;
} {
  const thursday = thursdayContainingYmd(ymd);
  const week = satsangWeekNumber(thursday);
  const week_label = week ? `आठवडा ${week.week} · ${week.year}` : "";
  const tithi = "तिथि: पंचांग stub";
  const line = [formatMarathiDate(thursday), week_label, tithi].filter(Boolean).join(" · ");
  return { todo: true, thursday, tithi, week_label, line };
}
