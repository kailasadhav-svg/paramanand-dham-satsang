export const DUTY_KIND_VAHAK = "vahak";
export const DUTY_KIND_SATSANG = "satsang_charansevak";
export type PlaceDutyKind = typeof DUTY_KIND_VAHAK | typeof DUTY_KIND_SATSANG;

/** Missing/blank duty_kind on old rows or old API bodies = विचार वाहक. */
export function asDutyKind(raw: unknown): PlaceDutyKind | null {
  if (raw == null || raw === "") return DUTY_KIND_VAHAK;
  if (raw === DUTY_KIND_VAHAK || raw === DUTY_KIND_SATSANG) return raw;
  return null;
}
