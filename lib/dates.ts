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
