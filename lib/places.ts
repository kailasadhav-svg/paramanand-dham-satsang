export type PlaceCode = "ranantri" | "varkhed" | "bartala" | "ambashi" | "nashik";

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
  { code: "ambashi", label: "अंबाशी", name: "अंबाशी" },
  { code: "nashik", label: "नाशिक", name: "नाशिक" },
];

const BY_CODE = new Map(PLACE_OPTIONS.map((p) => [p.code, p]));

export function isPlaceCode(value: string): value is PlaceCode {
  return BY_CODE.has(value as PlaceCode);
}

export function placeLabel(code: string): string {
  return BY_CODE.get(code as PlaceCode)?.label ?? code;
}

export function placeName(code: string): string {
  return BY_CODE.get(code as PlaceCode)?.name ?? code;
}

/** Match a typed/WhatsApp place (label, full name, or code). */
export function parsePlaceInput(raw: string): PlaceCode | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return null;
  for (const p of PLACE_OPTIONS) {
    const keys = [p.code, p.label, p.name].map((s) => s.toLowerCase().replace(/\s+/g, ""));
    if (keys.some((k) => k === t || t.includes(k) || k.includes(t))) return p.code;
  }
  return null;
}
