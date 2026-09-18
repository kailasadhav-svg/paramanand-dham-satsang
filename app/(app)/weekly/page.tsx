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
  TOPIC_THURSDAY_HELP,
} from "@/lib/labels";
import { placeLabel } from "@/lib/places";

type AnswerRow = {
  id: number;
  member_id: number;
  member_name?: string;
  place_code?: string;
  answer: string;
};

type WeeklyPayload = {
  week_start: string;
  question: { question: string; source: string | null } | null;
  answers: AnswerRow[];
};

export default function WeeklyAdminPage() {
  const [thursday, setThursday] = useState(defaultThursdayYmd());
  const [question, setQuestion] = useState("");
  const [source, setSource] = useState("");
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(false);
    void api<WeeklyPayload>(`/api/weekly?week_start=${thursday}`)
      .then((data) => {
        setQuestion(data.question?.question || "");
        setSource(data.question?.source || "");
        setAnswers(data.answers || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, [thursday]);

  async function save() {
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">साप्ताहिक विषय</h2>
      <p className="text-xs leading-relaxed text-temple-muted">{TOPIC_THURSDAY_HELP}</p>
      <p className="text-xs leading-relaxed text-temple-muted">
        {CHINTAN_DEADLINE_HELP} मुदत: {formatMarathiDate(chintanDeadlineYmd(thursday))} रात्री
        १२:००.
      </p>
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
      <h3 className="pt-2 font-semibold">
        {CHINTAN_LABEL} ({answers.length})
      </h3>
      <ul className="space-y-2">
        {answers.map((a) => (
          <li key={a.id} className="card p-3 text-sm">
            <p className="font-semibold">
              #{a.member_id} {a.member_name}
              {a.place_code ? ` · ${placeLabel(a.place_code)}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{a.answer}</p>
          </li>
        ))}
      </ul>
      {answers.length === 0 ? (
        <p className="text-sm text-temple-muted">अद्याप चिंतन नाही</p>
      ) : null}
    </div>
  );
}
