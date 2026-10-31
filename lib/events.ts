export type EventInput = {
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
};

export type PhotoMeta = {
  caption: string | null;
  taken_on: string | null;
  event_id: number | null;
};

export type PhotoInput = PhotoMeta & { image_url: string };

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Client re-encodes to ≤1600px JPEG before upload; these caps guard the server. */
export const MAX_UPLOAD_BYTES = 1_500_000;
export const MAX_THUMB_BYTES = 250_000;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown, max: number, label: string): Parsed<string | null> {
  const t = text(value);
  if (!t) return { ok: true, value: null };
  if (t.length > max) return { ok: false, error: `${label} ${max} अक्षरांपर्यंत` };
  return { ok: true, value: t };
}

export function parseEventInput(body: unknown): Parsed<EventInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = text(b.title);
  if (!title) return { ok: false, error: "कार्यक्रमाचे नाव आवश्यक" };
  if (title.length > 120) return { ok: false, error: "नाव १२० अक्षरांपर्यंत" };
  const event_date = text(b.event_date);
  if (!YMD.test(event_date)) return { ok: false, error: "तारीख आवश्यक (YYYY-MM-DD)" };
  const event_time = text(b.event_time);
  if (event_time && !HM.test(event_time)) return { ok: false, error: "वेळ HH:MM स्वरूपात" };
  const location = optionalText(b.location, 120, "स्थळ");
  if (!location.ok) return location;
  const description = optionalText(b.description, 2000, "माहिती");
  if (!description.ok) return description;
  return {
    ok: true,
    value: {
      title,
      event_date,
      event_time: event_time || null,
      location: location.value,
      description: description.value,
    },
  };
}

/** Only absolute http(s) links are stored — never javascript:/data: URLs. */
export function parseImageUrl(raw: unknown): string | null {
  const t = text(raw);
  if (!t || t.length > 2000) return null;
  try {
    const url = new URL(t);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Caption / date / event shared by link photos and uploads (form fields arrive as strings). */
export function parsePhotoMeta(body: unknown): Parsed<PhotoMeta> {
  const b = (body ?? {}) as Record<string, unknown>;
  const caption = optionalText(b.caption, 200, "वर्णन");
  if (!caption.ok) return caption;
  const taken_on = text(b.taken_on);
  if (taken_on && !YMD.test(taken_on)) return { ok: false, error: "तारीख YYYY-MM-DD स्वरूपात" };
  let event_id: number | null = null;
  if (b.event_id != null && b.event_id !== "") {
    const n = Number(b.event_id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "अवैध कार्यक्रम" };
    event_id = n;
  }
  return { ok: true, value: { caption: caption.value, taken_on: taken_on || null, event_id } };
}

export function parsePhotoInput(body: unknown): Parsed<PhotoInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const image_url = parseImageUrl(b.image_url);
  if (!image_url) return { ok: false, error: "छायाचित्राची http(s) लिंक आवश्यक" };
  const meta = parsePhotoMeta(b);
  if (!meta.ok) return meta;
  return { ok: true, value: { image_url, ...meta.value } };
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Magic-byte sniff — the client's declared Content-Type is never trusted. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function validateUploadBytes(
  bytes: Uint8Array,
  max: number,
  label: string,
): Parsed<ImageMime> {
  if (bytes.length === 0) return { ok: false, error: `${label} रिकामे आहे` };
  if (bytes.length > max) {
    return { ok: false, error: `${label} ${Math.round(max / 1000)} KB पेक्षा मोठे आहे` };
  }
  const mime = sniffImageMime(bytes);
  if (!mime) return { ok: false, error: `${label} JPEG / PNG / WebP असावे` };
  return { ok: true, value: mime };
}

type Dated = { event_date: string; event_time: string | null };

function dateKey(e: Dated): string {
  return `${e.event_date} ${e.event_time ?? ""}`;
}

/** Today counts as upcoming. Upcoming soonest-first, past most-recent-first. */
export function splitEventsByDate<T extends Dated>(
  events: T[],
  todayYmd: string,
): { upcoming: T[]; past: T[] } {
  const upcoming = events
    .filter((e) => e.event_date >= todayYmd)
    .sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
  const past = events
    .filter((e) => e.event_date < todayYmd)
    .sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
  return { upcoming, past };
}
