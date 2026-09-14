"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/PhoneGate";
import type { AjapaQuestion } from "@/lib/ajapa/types";
import { api } from "@/lib/api";
import { searchLocal } from "@/lib/offline/idb";
import { displayPhone } from "@/lib/offline/phone";
import { readLocalForProfile, syncAjapaFromServer } from "@/lib/offline/sync";

const STATUS_LABEL: Record<AjapaQuestion["status"], string> = {
  ai_answered: "परमानंद साहित्य",
  escalated: "संवादकांकडे",
  guru_answered: "संवादक उत्तर",
};

const ROLE_LABEL = {
  charansevak: "चरणसेवक",
  guru: "संवादक",
  software: "संचालक",
} as const;

export default function AjapaPage() {
  const profile = useProfile();
  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const syncAndLoad = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      setItems(await readLocalForProfile(profile));
      const result = await syncAjapaFromServer(profile);
      setItems(await readLocalForProfile(profile));
      setOffline(result.offline);
      const extra =
        result.mirrored && result.mirrored > 0
          ? ` · नवीन उत्तर ${result.mirrored}`
          : "";
      setSyncNote(
        result.offline
          ? "ऑफलाइन · लोकल यादी"
          : `सिंक · +${result.pulled} · एकूण ${result.localCount}${extra}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "लोड अयशस्वी");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void syncAndLoad();
  }, [syncAndLoad]);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    return searchLocal(list, query);
  }, [items, filter, query]);

  async function sendToGuru(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/ajapa/questions/${id}/escalate`, { method: "POST" });
      await syncAndLoad();
    } catch (e) {
      setError(e instanceof Error ? e.message : "पाठवता आले नाही");
    } finally {
      setBusyId(null);
    }
  }

  const viewHint =
    profile.role === "software"
      ? "संचालक — सर्व प्रश्न"
      : profile.role === "guru"
        ? "संवादक — उत्तर द्यावयाचे प्रश्न"
        : "तुमचे प्रश्न · साहित्य उत्तर · संवादकांकडे पाठवा";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">अजपा संवाद</h2>
          <p className="text-xs text-temple-muted">
            {ROLE_LABEL[profile.role]} · {displayPhone(profile.phone)}
            {offline ? " · ऑफलाइन" : ""}
          </p>
          <p className="text-[11px] text-temple-muted">{viewHint}</p>
          {syncNote ? (
            <p className="text-[11px] text-temple-muted">{syncNote}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncAndLoad()}
          className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {syncing ? "सिंक…" : "सिंक"}
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="लोकल शोध — प्रश्न / उत्तर / नाव"
        className="w-full rounded-xl border border-saffron-200 bg-white px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "सर्व"],
            ["ai_answered", "परमानंद साहित्य"],
            ["escalated", "संवादकांकडे"],
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
        {visible.map((q) => (
          <li key={q.id} className="card space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{q.question}</p>
              <span className="shrink-0 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200">
                {STATUS_LABEL[q.status]}
              </span>
            </div>
            {profile.role !== "charansevak" ? (
              <p className="text-xs text-temple-muted">
                {q.seeker_name ? `${q.seeker_name} · ` : ""}
                {displayPhone(q.seeker_phone)}
              </p>
            ) : null}
            {q.ai_answer ? (
              <details open={q.status === "ai_answered"} className="text-sm">
                <summary className="cursor-pointer font-medium text-saffron-800">
                  परमानंद साहित्य उत्तर
                </summary>
                <p className="mt-1 whitespace-pre-wrap text-temple-ink/90">
                  {q.ai_answer}
                </p>
              </details>
            ) : null}
            {q.status === "ai_answered" ? (
              <button
                type="button"
                disabled={busyId === q.id}
                onClick={() => void sendToGuru(q.id)}
                className="w-full rounded-xl bg-saffron-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busyId === q.id
                  ? "पाठवत आहे…"
                  : "मधुसुदनदास विजयानंद यांच्याकडे पाठवा"}
              </button>
            ) : null}
            {q.guru_answer_text ? (
              <div className="rounded-xl bg-saffron-50/60 p-2 text-sm">
                <p className="font-semibold text-saffron-900">संवादक उत्तर</p>
                <p className="whitespace-pre-wrap">{q.guru_answer_text}</p>
              </div>
            ) : null}
            {q.guru_answer_audio_url ? (
              <audio controls src={q.guru_answer_audio_url} className="w-full" />
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">
          {query
            ? "शोध रिक्त"
            : "अजपा संवाद मध्ये प्रश्न नाहीत — सिंक करा (किंवा प्रश्न टॅबवर नवीन प्रश्न विचारा)"}
        </p>
      ) : null}
    </div>
  );
}
