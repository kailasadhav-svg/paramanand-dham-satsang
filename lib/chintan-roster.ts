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
