"use client";

import { useEffect, useState } from "react";
import { SaveBar } from "@/components/FormBits";
import { api } from "@/lib/api";
import {
  addDaysYmd,
  chintanDeadlineYmd,
  defaultThursdayYmd,
  formatMarathiDate,
} from "@/lib/dates";
import {
  CHINTAN_DEADLINE_HELP,
  CHINTAN_LABEL,
  GUIDE_CHINTAN_RANK_HELP,
  GUIDE_TOPIC_HELP,
  TOPIC_THURSDAY_HELP,
  VAHAK_JOB_HELP,
  VAHAK_LABEL,
} from "@/lib/labels";
import { placeLabel } from "@/lib/places";

type RosterRow = {
  member_id: number;
  member_name: string;
  place_code?: string;
  place_label?: string;
  submitted: boolean;
  answer?: string;
};

type WeeklyPayload = {
  week_start: string;
  question: { question: string; source: string | null } | null;
  can_edit_question?: boolean;
  can_see_bodies?: boolean;
  is_vahak?: boolean;
  roster?: RosterRow[];
};

export default function WeeklyAdminPage() {
  const [thursday, setThursday] = useState(defaultThursdayYmd());
  const [question, setQuestion] = useState("");
  const [source, setSource] = useState("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canSeeBodies, setCanSeeBodies] = useState(false);
  const [isVahak, setIsVahak] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(false);
    void api<WeeklyPayload>(`/api/weekly?week_start=${thursday}`)
      .then((data) => {
        setQuestion(data.question?.question || "");
        setSource(data.question?.source || "");
        setRoster(data.roster || []);
        setCanEdit(Boolean(data.can_edit_question));
        setCanSeeBodies(Boolean(data.can_see_bodies));
        setIsVahak(Boolean(data.is_vahak));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, [thursday]);

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/weekly", {
        method: "POST",
        body: JSON.stringify({ week_start: thursday, question, source }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSaving(false);
    }
  }

  async function exportVillagePdf() {
    if (!canSeeBodies) return;
    setPdfBusy(true);
    setPdfNote(null);
    try {
      const data = await api<{
        todo?: boolean;
        message?: string;
        villages?: { place_label: string; submitted: unknown[]; pending: unknown[] }[];
      }>(`/api/weekly/chintan-pdf?week_start=${thursday}`);
      const n = data.villages?.length ?? 0;
      setPdfNote(
        `${data.message || "गावानुसार चिंतन"} · ${n} स्थळे` +
          (data.todo ? " (PDF stub)" : ""),
      );
    } catch (e) {
      setPdfNote(e instanceof Error ? e.message : "PDF अयशस्वी");
    } finally {
      setPdfBusy(false);
    }
  }

  const pending = roster.filter((r) => !r.submitted);
  const done = roster.filter((r) => r.submitted);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">
        {isVahak ? `${VAHAK_LABEL} · ${CHINTAN_LABEL}` : `साप्ताहिक विषय · ${CHINTAN_LABEL}`}
      </h2>
      <p className="text-xs leading-relaxed text-temple-muted">{TOPIC_THURSDAY_HELP}</p>
      <p className="text-xs leading-relaxed text-temple-muted">
        {CHINTAN_DEADLINE_HELP} मुदत: {formatMarathiDate(chintanDeadlineYmd(thursday))} रात्री
        १२:००.
      </p>
      {canEdit ? (
        <p className="text-xs leading-relaxed text-temple-muted">{GUIDE_TOPIC_HELP}</p>
      ) : (
        <p className="text-xs leading-relaxed text-temple-muted">{VAHAK_JOB_HELP}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl bg-white px-3 py-2 ring-1 ring-saffron-200"
          onClick={() => setThursday((d) => addDaysYmd(d, -7))}
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={thursday}
            onChange={(e) => setThursday(e.target.value)}
            className="w-full rounded-xl bg-white px-3 py-2 text-center ring-1 ring-saffron-200"
          />
          <p className="mt-1 text-xs text-temple-muted">{formatMarathiDate(thursday)}</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-white px-3 py-2 ring-1 ring-saffron-200"
          onClick={() => setThursday((d) => addDaysYmd(d, 7))}
        >
          ›
        </button>
      </div>
      {canEdit ? (
        <>
          <label className="block text-xs font-semibold text-temple-muted">
            विषय
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200"
              placeholder="या आठवड्याचा विषय"
              aria-label="विषय"
            />
          </label>
          <label className="block text-xs font-semibold text-temple-muted">
            स्रोत
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200"
              placeholder="उदा. आत्मप्रभा / उपदेश"
            />
          </label>
          <SaveBar saving={saving} saved={saved} error={error} onSave={() => void save()} />
        </>
      ) : question ? (
        <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-saffron-200">
          <p className="text-xs font-semibold text-temple-muted">या आठवड्याचा विषय</p>
          <p className="mt-1 leading-relaxed">{question}</p>
        </div>
      ) : (
        <p className="text-sm text-temple-muted">या आठवड्याचा विषय अद्याप नाही.</p>
      )}
      {error && !canEdit ? <p className="text-sm text-red-700">{error}</p> : null}

      <h3 className="pt-2 font-semibold">
        {CHINTAN_LABEL} पाठपुरावा ({done.length} आले · {pending.length} बाकी)
      </h3>
      {!canSeeBodies ? (
        <p className="text-[11px] text-temple-muted">
          {VAHAK_LABEL} फक्त स्थिती पाहतात. पूर्ण चिंतन फक्त मधुसुदनदास.
        </p>
      ) : (
        <p className="text-[11px] text-temple-muted">
          पूर्ण चिंतन — फक्त मार्गदर्शक (मधुसुदनदास). {GUIDE_CHINTAN_RANK_HELP}
        </p>
      )}
      {canSeeBodies ? (
        <div className="space-y-1">
          <button
            type="button"
            disabled={pdfBusy}
            onClick={() => void exportVillagePdf()}
            className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-saffron-900 ring-1 ring-saffron-200 disabled:opacity-50"
          >
            {pdfBusy ? "तयार…" : "गावानुसार चिंतन PDF (stub)"}
          </button>
          {pdfNote ? <p className="text-[11px] text-temple-muted">{pdfNote}</p> : null}
        </div>
      ) : null}
      <ul className="space-y-2">
        {roster.map((a) => (
          <li key={a.member_id} className="card p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">
                {a.member_name}
                {a.place_label || a.place_code
                  ? ` · ${a.place_label || placeLabel(a.place_code || "")}`
                  : ""}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  a.submitted
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                }`}
              >
                {a.submitted ? "आले" : "बाकी"}
              </span>
            </div>
            {canSeeBodies && a.submitted && a.answer ? (
              <p className="mt-1 whitespace-pre-wrap">{a.answer}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {roster.length === 0 ? (
        <p className="text-sm text-temple-muted">या स्थळी परमानंद चरणसेवक यादी रिकामी आहे</p>
      ) : null}
    </div>
  );
}
