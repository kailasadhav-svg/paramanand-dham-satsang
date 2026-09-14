"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type TopicRow = {
  place_id: number;
  place_name: string;
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
  conductor: string | null;
  notes: string | null;
};

const KIND: Record<string, string> = {
  atmaprabha: "आत्मप्रभा",
  upadesh: "उपदेश",
};

/** All places' topics for a Thursday — visible to every role (नाशिक incl.). */
export function WeeklyTopics({
  date,
  highlightPlaceId,
  compact,
}: {
  date: string;
  highlightPlaceId?: number | "";
  compact?: boolean;
}) {
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    void api<{ date: string; topics: TopicRow[] }>(`/api/meetings?date=${date}`)
      .then((data) => {
        if (!cancelled) setRows(data.topics || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "विषय लोड नाही");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (error) {
    return <p className="text-xs text-red-700">{error}</p>;
  }
  if (!rows.length) {
    return (
      <p className="rounded-xl bg-saffron-50 px-3 py-2 text-xs text-temple-muted">
        या तारखेचे विषय लोड होत आहेत…
      </p>
    );
  }

  const filled = rows.filter((r) => r.topic_title || r.topic_kind);
  const focus =
    highlightPlaceId !== undefined && highlightPlaceId !== ""
      ? rows.find((r) => r.place_id === highlightPlaceId)
      : null;

  return (
    <section
      className={`space-y-2 rounded-2xl bg-white p-3 ring-1 ring-saffron-200 ${
        compact ? "" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-saffron-900">आजचे / गुरुवारचे विषय</h3>
          <p className="text-[11px] text-temple-muted">
            सर्व स्थळे · नाशिकसह सर्वांना दिसतात
          </p>
        </div>
        <Link
          href="/topic"
          className="shrink-0 text-[11px] font-semibold text-saffron-800 underline"
        >
          विषय पान
        </Link>
      </div>

      {focus?.topic_title ? (
        <div className="rounded-xl bg-saffron-50 px-3 py-2 ring-1 ring-saffron-100">
          <p className="text-[11px] font-semibold text-temple-muted">
            {focus.place_name}
            {focus.topic_kind ? ` · ${KIND[focus.topic_kind] || ""}` : ""}
          </p>
          <p className="text-base font-bold text-saffron-900">{focus.topic_title}</p>
          {focus.conductor ? (
            <p className="text-xs text-temple-muted">संचालक: {focus.conductor}</p>
          ) : null}
          {focus.notes ? (
            <p className="mt-1 text-xs text-temple-ink/80">{focus.notes}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="divide-y divide-saffron-100">
        {rows.map((r) => {
          const active = highlightPlaceId === r.place_id;
          return (
            <li
              key={r.place_id}
              className={`flex items-start justify-between gap-2 py-2 text-sm ${
                active ? "font-semibold" : ""
              }`}
            >
              <span className="text-temple-muted">{r.place_name}</span>
              <span className="max-w-[60%] text-right text-temple-ink">
                {r.topic_title ? (
                  <>
                    {r.topic_kind ? (
                      <span className="text-[10px] text-saffron-800">
                        {KIND[r.topic_kind]} ·{" "}
                      </span>
                    ) : null}
                    {r.topic_title}
                  </>
                ) : (
                  <span className="text-xs text-temple-muted">अजून विषय नाही</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {!filled.length ? (
        <p className="text-[11px] text-amber-900">
          विषय अजून जतन नाही — संचालक / संवादक «विषय» मेनूमध्ये लिहून जतन करा.
        </p>
      ) : null}
    </section>
  );
}
