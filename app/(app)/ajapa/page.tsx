"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type AjapaQuestion = {
  id: number;
  seeker_phone: string;
  seeker_name: string | null;
  question: string;
  ai_answer: string | null;
  status: "ai_answered" | "escalated" | "guru_answered";
  guru_answer_text: string | null;
  guru_answer_audio_url: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<AjapaQuestion["status"], string> = {
  ai_answered: "AI उत्तर",
  escalated: "गुरुंकडे",
  guru_answered: "गुरु उत्तर",
};

export default function AjapaPage() {
  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (filter !== "all") q.set("status", filter);
      const data = await api<{ questions: AjapaQuestion[] }>(
        `/api/ajapa/questions?${q.toString()}`,
      );
      setItems(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "लोड अयशस्वी");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">अजपा प्रश्नोत्तर</h2>
        <p className="text-sm text-temple-muted">
          WhatsApp · <code className="text-xs">अजपा Q</code> /{" "}
          <code className="text-xs">अजपा A</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "सर्व"],
            ["ai_answered", "AI"],
            ["escalated", "गुरुंकडे"],
            ["guru_answered", "पूर्ण"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              filter === value
                ? "bg-saffron-700 text-white ring-saffron-700"
                : "bg-white ring-saffron-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-temple-muted">लोड होत आहे…</p> : null}

      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id} className="card space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{q.question}</p>
              <span className="shrink-0 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200">
                {STATUS_LABEL[q.status]}
              </span>
            </div>
            <p className="text-xs text-temple-muted">
              {q.seeker_name ? `${q.seeker_name} · ` : ""}
              {q.seeker_phone}
            </p>
            {q.ai_answer ? (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-saffron-800">AI उत्तर</summary>
                <p className="mt-1 whitespace-pre-wrap text-temple-ink/90">{q.ai_answer}</p>
              </details>
            ) : null}
            {q.guru_answer_text ? (
              <div className="rounded-xl bg-saffron-50/60 p-2 text-sm">
                <p className="font-semibold text-saffron-900">गुरु उत्तर</p>
                <p className="whitespace-pre-wrap">{q.guru_answer_text}</p>
              </div>
            ) : null}
            {q.guru_answer_audio_url ? (
              <audio controls src={q.guru_answer_audio_url} className="w-full" />
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && items.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">अजपा प्रश्न नाहीत</p>
      ) : null}
    </div>
  );
}
