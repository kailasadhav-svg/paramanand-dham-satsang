import { listChintanRoster } from "./chintan.ts";
import { groupChintanByVillage } from "./chintan-roster.ts";
import { CHINTAN_LABEL } from "./labels.ts";

export { groupChintanByVillage } from "./chintan-roster.ts";

/**
 * TODO: render a real village-wise combined PDF of all चिंतन (fonts, page
 * breaks, मार्गदर्शक letterhead). Until then this returns grouped JSON.
 */
export async function villageChintanPdfStub(weekStart: string): Promise<{
  todo: true;
  format: "json-stub";
  message: string;
  week_start: string;
  villages: ReturnType<typeof groupChintanByVillage>;
}> {
  const rows = await listChintanRoster({ weekStart, placeCodes: null });
  return {
    todo: true,
    format: "json-stub",
    message: `TODO: गावानुसार सर्व ${CHINTAN_LABEL} PDF. आत्ता JSON गट.`,
    week_start: weekStart,
    villages: groupChintanByVillage(rows),
  };
}
