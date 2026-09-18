export type PlaceCode = "ranantri" | "varkhed" | "bartala" | "shindi" | "nashik";

export type PlaceOption = {
  code: PlaceCode;
  label: string;
  name: string;
};

/** Registration dropdown — short Marathi labels from the product spec. */
export const PLACE_OPTIONS: PlaceOption[] = [
  { code: "ranantri", label: "रानअंत्री", name: "श्री क्षेत्र रानअंत्री" },
  { code: "varkhed", label: "वरखेड", name: "वरखेड" },
  { code: "bartala", label: "बरटाळा", name: "बरटाळा" },
  { code: "shindi", label: "शिंदी", name: "शिंदी" },
  { code: "nashik", label: "नाशिक", name: "नाशिक" },
];

/** Old code/label still accepted as input so existing WhatsApp replies keep working. */
const PLACE_INPUT_ALIASES: Record<string, PlaceCode> = {
  ambashi: "shindi",
  अंबाशी: "shindi",
};

const BY_CODE = new Map(PLACE_OPTIONS.map((p) => [p.code, p]));

export function isPlaceCode(value: string): value is PlaceCode {
  return BY_CODE.has(value as PlaceCode);
}

/** Map a stored or submitted code onto the current catalog (ambashi → shindi). */
export function canonicalizePlaceCode(value: string): PlaceCode | null {
  const t = value.trim().toLowerCase();
  if (!t) return null;
  const aliased = PLACE_INPUT_ALIASES[t];
  if (aliased) return aliased;
  return isPlaceCode(t) ? t : null;
}

export function placeLabel(code: string): string {
  const resolved = canonicalizePlaceCode(code) ?? code;
  return BY_CODE.get(resolved as PlaceCode)?.label ?? resolved;
}

export function placeName(code: string): string {
  const resolved = canonicalizePlaceCode(code) ?? code;
  return BY_CODE.get(resolved as PlaceCode)?.name ?? resolved;
}

/** Map a DB `places.name` (e.g. नाशिक) onto the registration place code. */
export function placeCodeFromDbName(name: string): PlaceCode | null {
  const hit = PLACE_OPTIONS.find((p) => p.name === name || p.label === name);
  return hit?.code ?? parsePlaceInput(name);
}

/** Match a typed/WhatsApp place (label, full name, or code). */
export function parsePlaceInput(raw: string): PlaceCode | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return null;
  const aliased = PLACE_INPUT_ALIASES[t];
  if (aliased) return aliased;
  for (const p of PLACE_OPTIONS) {
    const keys = [p.code, p.label, p.name].map((s) => s.toLowerCase().replace(/\s+/g, ""));
    if (keys.some((k) => k === t || t.includes(k) || k.includes(t))) return p.code;
  }
  return null;
}
