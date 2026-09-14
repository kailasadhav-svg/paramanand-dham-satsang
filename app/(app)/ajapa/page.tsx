"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import type { AjapaQuestion } from "@/lib/ajapa/types";
import { searchLocal, upsertQuestions } from "@/lib/offline/idb";
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
  satsangi: "सत्संगी चरणसेवक",
} as const;

export default function AjapaPage() {
  const profile = useProfile();
  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const canAsk =
    profile.role === "charansevak" ||
    profile.role === "satsangi" ||
    profile.role === "software";

  const syncAndLoad = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      setItems(await readLocalForProfile(profile));
      const result = await syncAjapaFromServer(profile);
      setItems(await readLocalForProfile(profile));
      setOffline(result.offline);
      setSyncNote(
        result.offline
          ? "ऑफलाइन · लोकल यादी"
          : `सिंक · +${result.pulled} · एकूण ${result.localCount}`,
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

  const viewHint =
    profile.role === "software"
      ? "संचालक — सर्व प्रश्न"
      : profile.role === "guru"
        ? "संवादक — उत्तर द्यावयाचे प्रश्न"
        : profile.role === "charansevak"
          ? "चरणसेवक — प्रश्न टाका / सिंक"
          : "सत्संगी — प्रश्न टाका / सिंक";

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 3) {
      setError("प्रश्न थोडा मोठा लिहा");
      return;
    }
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await api<{ question: AjapaQuestion }>("/api/ajapa/questions", {
        method: "POST",
        body: JSON.stringify({
          question: text,
          seeker_name: profile.name || null,
        }),
      });
      await upsertQuestions([data.question]);
      setDraft("");
      setFilter("all");
      setQuery("");
      setOkMsg("प्रश्न जतन · परमानंद साहित्य उत्तर खाली दिसेल");
      setItems(await readLocalForProfile(profile));
      void syncAndLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "प्रश्न जतन अयशस्वी");
    } finally {
      setSubmitting(false);
    }
  }

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
          {syncNote ? <p className="text-[11px] text-temple-muted">{syncNote}</p> : null}
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

      {canAsk ? (
        <form
          onSubmit={(e) => void submitQuestion(e)}
          className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-saffron-200"
        >
          <p className="text-sm font-bold text-saffron-900">नवीन प्रश्न टाका</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="उदा. अजपा म्हणजे काय?"
            className="w-full rounded-xl border border-saffron-200 bg-saffron-50 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || draft.trim().length < 3}
            className="w-full rounded-2xl bg-saffron-700 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "उत्तर तयार…" : "प्रश्न पाठवा"}
          </button>
          <p className="text-[11px] text-temple-muted">
            वरचा शोध बॉक्स फक्त यादी शोधतो — प्रश्न येथे टाका
          </p>
        </form>
      ) : (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-xs text-temple-muted">
          संवादक यादी पाहतात · प्रश्न चरणसेवक / सत्संगी टाकतात
        </p>
      )}

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

      {okMsg ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{okMsg}</p>
      ) : null}
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
            {profile.role === "software" || profile.role === "guru" ? (
              <p className="text-xs text-temple-muted">
                {q.seeker_name ? `${q.seeker_name} · ` : ""}
                {displayPhone(q.seeker_phone)}
              </p>
            ) : null}
            {q.ai_answer ? (
              <details className="text-sm" open>
                <summary className="cursor-pointer font-medium text-saffron-800">
                  परमानंद साहित्य
                </summary>
                <p className="mt-1 whitespace-pre-wrap text-temple-ink/90">{q.ai_answer}</p>
              </details>
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
            ? "शोध रिक्त — फिल्टर «सर्व» करा किंवा शोध मिटवा"
            : canAsk
              ? "अजून प्रश्न नाहीत — वर «नवीन प्रश्न टाका» वापरा"
              : "अजपा संवाद मध्ये प्रश्न नाहीत — सिंक करा"}
        </p>
      ) : null}
    </div>
  );
}
