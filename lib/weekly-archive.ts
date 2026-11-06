import { archiveSourceWeekStart } from "./dates.ts";
import {
  WEEKLY_ARCHIVE_HELP,
  WEEKLY_ARCHIVE_SUMMARY_HELP,
  WEEKLY_ARCHIVE_VAHAK_HELP,
} from "./labels.ts";
import type { VillageChintanBundle } from "./chintan-roster.ts";

export {
  WEEKLY_ARCHIVE_HELP,
  WEEKLY_ARCHIVE_SUMMARY_HELP,
  WEEKLY_ARCHIVE_VAHAK_HELP,
};
export { archiveSourceWeekStart };

export class ArchiveError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ArchiveSummaryKind = "text" | "photo" | "voice";

export type ArchiveSummary = {
  kind: ArchiveSummaryKind;
  text?: string;
  filename?: string;
};

export type VillageWeekArchive = {
  week_start: string;
  place_code: string;
  place_label: string;
  generated_at: string;
  immutable: true;
  owner: "मार्गदर्शक";
  visible: boolean;
  share_to_village_admin: boolean;
  chintan_file: VillageChintanBundle;
  qa_file: { question: string; answer: string | null; public_id?: string }[];
  summary: ArchiveSummary | null;
  summary_read: boolean;
};

const store = new Map<string, VillageWeekArchive>();

function storeKey(weekStart: string, placeCode: string): string {
  return `${weekStart}|${placeCode}`;
}

export function resetArchiveStoreForTests(): void {
  store.clear();
}

export function listStoredArchives(weekStart?: string): VillageWeekArchive[] {
  const rows = [...store.values()];
  if (!weekStart) return rows;
  return rows.filter((r) => r.week_start === weekStart);
}

export function getStoredArchive(
  weekStart: string,
  placeCode: string,
): VillageWeekArchive | undefined {
  return store.get(storeKey(weekStart, placeCode));
}

/** First generate wins — later calls do not rewrite चिंतन / प्रश्न files. */
export function upsertGeneratedArchives(
  rows: VillageWeekArchive[],
): VillageWeekArchive[] {
  const out: VillageWeekArchive[] = [];
  for (const row of rows) {
    const k = storeKey(row.week_start, row.place_code);
    const existing = store.get(k);
    if (existing) {
      out.push(existing);
      continue;
    }
    store.set(k, row);
    out.push(row);
  }
  return out;
}

export function buildVillageArchives(opts: {
  weekStart: string;
  generatedAt: string;
  villages: VillageChintanBundle[];
  questions: {
    place_code: string;
    question: string;
    answer: string | null;
    public_id?: string;
  }[];
}): VillageWeekArchive[] {
  const qaByPlace = new Map<string, VillageWeekArchive["qa_file"]>();
  for (const q of opts.questions) {
    const code = q.place_code || "unknown";
    const list = qaByPlace.get(code) || [];
    list.push({
      question: q.question,
      answer: q.answer,
      public_id: q.public_id,
    });
    qaByPlace.set(code, list);
  }
  const places = new Map<string, { code: string; label: string }>();
  for (const v of opts.villages) {
    places.set(v.place_code, { code: v.place_code, label: v.place_label });
  }
  for (const q of opts.questions) {
    if (!places.has(q.place_code)) {
      places.set(q.place_code, { code: q.place_code, label: q.place_code });
    }
  }
  return [...places.values()].map((p) => {
    const village =
      opts.villages.find((v) => v.place_code === p.code) || {
        place_code: p.code,
        place_label: p.label,
        submitted: [],
        pending: [],
      };
    return {
      week_start: opts.weekStart,
      place_code: p.code,
      place_label: village.place_label || p.label,
      generated_at: opts.generatedAt,
      immutable: true as const,
      owner: "मार्गदर्शक" as const,
      visible: false,
      share_to_village_admin: false,
      chintan_file: village,
      qa_file: qaByPlace.get(p.code) || [],
      summary: null,
      summary_read: false,
    };
  });
}

/** True when मार्गदर्शक finished सारांश via any one of: typed text, photo/file, or voice. */
export function isArchiveSummaryComplete(
  summary: ArchiveSummary | null | undefined,
): boolean {
  if (!summary) return false;
  if (summary.kind === "text") return Boolean(summary.text?.trim());
  if (summary.kind === "photo" || summary.kind === "voice") {
    return Boolean(summary.filename?.trim());
  }
  return false;
}

export function applyArchiveSummary(
  archive: VillageWeekArchive,
  summary: ArchiveSummary,
): VillageWeekArchive {
  if (!summary.kind || !["text", "photo", "voice"].includes(summary.kind)) {
    throw new ArchiveError("सारांश प्रकार: टाइप / छायाचित्र / व्हॉइस", 400);
  }
  if (summary.kind === "text" && !summary.text?.trim()) {
    throw new ArchiveError("सारांश लिहा", 400);
  }
  if ((summary.kind === "photo" || summary.kind === "voice") && !summary.filename?.trim()) {
    throw new ArchiveError("सारांश फाइल नाव", 400);
  }
  return { ...archive, summary };
}

export function applyArchiveVisibility(
  archive: VillageWeekArchive,
  visible: boolean,
): VillageWeekArchive {
  if (visible && !archive.summary) {
    throw new ArchiveError(WEEKLY_ARCHIVE_SUMMARY_HELP, 400);
  }
  return { ...archive, visible };
}

export function applyArchiveShare(
  archive: VillageWeekArchive,
  shareToVillageAdmin: boolean,
): VillageWeekArchive {
  if (shareToVillageAdmin && !archive.visible) {
    throw new ArchiveError("आधी दिसणारे करा", 400);
  }
  return { ...archive, share_to_village_admin: shareToVillageAdmin };
}

export function applyArchiveAckRead(archive: VillageWeekArchive): VillageWeekArchive {
  if (!archive.visible || !archive.summary) {
    throw new ArchiveError(WEEKLY_ARCHIVE_VAHAK_HELP, 400);
  }
  return { ...archive, summary_read: true };
}

export function mutateStoredArchive(
  weekStart: string,
  placeCode: string,
  fn: (row: VillageWeekArchive) => VillageWeekArchive,
): VillageWeekArchive {
  const existing = getStoredArchive(weekStart, placeCode);
  if (!existing) throw new ArchiveError("संग्रह फाइल नाही — आधी तयार करा", 404);
  const next = fn(existing);
  store.set(storeKey(weekStart, placeCode), next);
  return next;
}

/** विचार वाहक see only visible files for their places. */
export function filterArchivesForActor(
  rows: VillageWeekArchive[],
  opts: { guide: boolean; vahakPlaceCodes: string[] },
): VillageWeekArchive[] {
  if (opts.guide) return rows;
  const codes = new Set(opts.vahakPlaceCodes);
  return rows.filter((r) => r.visible && codes.has(r.place_code));
}
