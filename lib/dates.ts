const TZ = "Asia/Kolkata";

export function ymdInIndia(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function weekdayInIndia(date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** Most recent Thursday in India (today if today is Thursday). */
export function defaultThursdayYmd(now = new Date()): string {
  const today = ymdInIndia(now);
  const [y, m, d] = today.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  const day = weekdayInIndia(utcNoon);
  const back = (day + 7 - 4) % 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - back);
  return ymdInIndia(utcNoon);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return ymdInIndia(dt);
}

export function weekFromThursday(thursdayYmd: string): { start: string; end: string } {
  return { start: thursdayYmd, end: addDaysYmd(thursdayYmd, 6) };
}

/** चिंतन due: Wednesday after that Thursday, 12:00 night (week end). */
export function chintanDeadlineYmd(thursdayYmd: string): string {
  return addDaysYmd(thursdayYmd, 6);
}

export function formatMarathiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  return new Intl.DateTimeFormat("mr-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

export function formatMarathiShort(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  return new Intl.DateTimeFormat("mr-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(dt);
}

export const DEFAULT_MEETING_TIME = "20:00";

/** Minutes from 00:00 in Asia/Kolkata. */
export function minutesInIndia(now = new Date()): number {
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * शुक्रवार ०६:००–१२:०० IST of the Friday after `thursdayYmd`.
 * सत्संग चरणसेवक may appoint विचार वाहक only in this window, and only if empty.
 */
export function isFridayVahakAppointWindowForWeek(
  thursdayYmd: string,
  now = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(thursdayYmd)) return false;
  const friday = addDaysYmd(thursdayYmd, 1);
  if (ymdInIndia(now) !== friday) return false;
  const mins = minutesInIndia(now);
  return mins >= 6 * 60 && mins <= 12 * 60;
}

/**
 * शुक्रवार ०६:००–१२:०० (IST) for the current satsang week
 * (most recent Thursday’s following Friday).
 */
export function isFridayVahakAppointWindow(now = new Date()): boolean {
  return isFridayVahakAppointWindowForWeek(defaultThursdayYmd(now), now);
}

/**
 * After Friday 12:00 noon IST of that week: if still no वाहक,
 * last Thursday’s person continues.
 */
export function shouldAutoContinueVahak(thursdayYmd: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(thursdayYmd)) return false;
  const friday = addDaysYmd(thursdayYmd, 1);
  const today = ymdInIndia(now);
  if (today > friday) return true;
  if (today < friday) return false;
  return minutesInIndia(now) > 12 * 60;
}

/** Thursday that opens the satsang week containing `ymd` (IST). */
export function thursdayContainingYmd(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return defaultThursdayYmd();
  const [y, m, d] = ymd.split("-").map(Number);
  return defaultThursdayYmd(new Date(Date.UTC(y, m - 1, d, 6, 30, 0)));
}

/** Product week 1 = first Thursday of January 2026. */
export const SATSANG_WEEK1_THURSDAY = "2026-01-01";

export function diffDaysYmd(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

/** First Thursday of January in IST for that calendar year. */
export function firstThursdayOfJanuary(year: number): string {
  const jan1 = `${year}-01-01`;
  const [y, m, d] = jan1.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  const day = weekdayInIndia(utcNoon);
  const add = (4 - day + 7) % 7;
  return addDaysYmd(jan1, add);
}

/**
 * Satsang week number within the year: week 1 = first Thursday of January.
 * Returns null before 2026-01-01.
 */
export function satsangWeekNumber(
  thursdayYmd: string,
): { year: number; week: number } | null {
  const th = /^\d{4}-\d{2}-\d{2}$/.test(thursdayYmd)
    ? thursdayContainingYmd(thursdayYmd)
    : "";
  if (!th || th < SATSANG_WEEK1_THURSDAY) return null;
  const calendarYear = Number(th.slice(0, 4));
  let year = calendarYear;
  let start = firstThursdayOfJanuary(year);
  if (th < start) {
    year -= 1;
    start = firstThursdayOfJanuary(year);
  }
  const days = diffDaysYmd(start, th);
  return { year, week: Math.floor(days / 7) + 1 };
}
