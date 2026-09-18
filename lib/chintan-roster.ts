export type ChintanStatusRow = {
  member_id: number;
  member_name: string;
  place_code: string;
  place_label: string;
  submitted: boolean;
  answer?: string;
};

/** Strip चिंतन body unless the actor may see full text (guru / मधुसुदनदास). */
export function redactChintanRoster(
  rows: ChintanStatusRow[],
  seeBody: boolean,
): ChintanStatusRow[] {
  return rows.map((r) => {
    const out: ChintanStatusRow = {
      member_id: r.member_id,
      member_name: r.member_name,
      place_code: r.place_code,
      place_label: r.place_label,
      submitted: r.submitted,
    };
    if (seeBody && r.submitted && r.answer != null) out.answer = r.answer;
    return out;
  });
}

/** `null` = every place (staff). `[]` = nobody (non-vahak). */
export function scopeChintanRoster(
  rows: ChintanStatusRow[],
  placeCodes: string[] | null,
): ChintanStatusRow[] {
  if (placeCodes == null) return rows;
  const codes = new Set(placeCodes);
  return rows.filter((r) => codes.has(String(r.place_code)));
}

export type VillageChintanBundle = {
  place_code: string;
  place_label: string;
  submitted: { member_name: string; answer?: string }[];
  pending: string[];
};

/** Group चिंतन by village for the combined PDF stub. */
export function groupChintanByVillage(rows: ChintanStatusRow[]): VillageChintanBundle[] {
  const order: string[] = [];
  const map = new Map<string, VillageChintanBundle>();
  for (const row of rows) {
    const key = row.place_code || "_";
    let bundle = map.get(key);
    if (!bundle) {
      bundle = {
        place_code: row.place_code,
        place_label: row.place_label || row.place_code,
        submitted: [],
        pending: [],
      };
      map.set(key, bundle);
      order.push(key);
    }
    if (row.submitted) {
      bundle.submitted.push({
        member_name: row.member_name,
        answer: row.answer,
      });
    } else {
      bundle.pending.push(row.member_name);
    }
  }
  return order.map((k) => map.get(k)!);
}
