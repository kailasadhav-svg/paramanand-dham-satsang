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
