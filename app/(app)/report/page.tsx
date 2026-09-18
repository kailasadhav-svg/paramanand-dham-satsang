"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDaysYmd, defaultThursdayYmd, formatMarathiDate } from "@/lib/dates";
import { TOPIC_LABEL } from "@/lib/labels";

type Report = {
  thursday: string;
  week: { start: string; end: string };
  totals: { attendance: number; questions: number; answered: number; unanswered: number };
  whatsappText: string;
  places: {
    place: { id: number; name: string };
    total: number;
    meeting: {
      men: number;
      women: number;
      children: number;
      topic_kind: string | null;
      topic_title: string | null;
      conductor: string | null;
    } | null;
  }[];
};

export default function ReportPage() {
  const [thursday, setThursday] = useState(defaultThursdayYmd());
  const [report, setReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collisionCount, setCollisionCount] = useState(0);

  useEffect(() => {
    setCopied(false);
    void api<Report>(`/api/report?thursday=${thursday}`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "अहवाल लोड नाही"));
  }, [thursday]);

  useEffect(() => {
    void api<{ collision_count: number }>("/api/members")
      .then((data) => {
        setCollisionCount(data.collision_count);
      })
      .catch(() => {
        setCollisionCount(0);
      });
  }, []);

  async function copyText() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.whatsappText);
      setCopied(true);
    } catch {
      setError("कॉपी करता आले नाही — खालील मजकूर निवडा");
    }
  }

  const waHref = report
    ? `https://wa.me/?text=${encodeURIComponent(report.whatsappText)}`
    : "#";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">साप्ताहिक अहवाल</h2>
      {collisionCount > 0 ? (
        <a
          href="/members"
          className="block rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          {collisionCount} परमानंद चरणसेवकांना ६-अंकी संकेत दिला (टक्कर) — यादी पाहा
        </a>
      ) : null}
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

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {report ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3 text-center">
              <p className="text-xs text-temple-muted">एकूण उपस्थिती</p>
              <p className="text-2xl font-bold text-saffron-800">{report.totals.attendance}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xs text-temple-muted">प्रश्न / उत्तरित</p>
              <p className="text-2xl font-bold text-saffron-800">
                {report.totals.questions}/{report.totals.answered}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {report.places.map((row) => (
              <li key={row.place.id} className="card p-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{row.place.name}</p>
                  <p className="text-saffron-800 font-bold">{row.total}</p>
                </div>
                {row.meeting?.topic_kind || row.meeting?.topic_title ? (
                  <p className="mt-1 text-sm text-temple-muted">
                    {row.meeting.topic_kind ? TOPIC_LABEL[row.meeting.topic_kind] : ""}
                    {row.meeting.topic_title ? ` — ${row.meeting.topic_title}` : ""}
                    {row.meeting.conductor ? ` · ${row.meeting.conductor}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-temple-muted">विषय नोंद नाही</p>
                )}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copyText()}
              className="rounded-2xl bg-saffron-700 py-3 font-semibold text-white"
            >
              {copied ? "कॉपी झाले" : "WhatsApp मजकूर कॉपी"}
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-emerald-700 py-3 text-center font-semibold text-white"
            >
              WhatsApp उघडा
            </a>
          </div>
          <textarea
            readOnly
            value={report.whatsappText}
            rows={16}
            className="w-full rounded-2xl bg-white p-3 text-sm leading-relaxed ring-1 ring-saffron-200"
          />
        </>
      ) : (
        <p className="text-sm text-temple-muted">अहवाल लोड होत आहे…</p>
      )}
    </div>
  );
}
