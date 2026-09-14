"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InstallBanner } from "@/components/InstallBanner";
import type { AjapaQuestion } from "@/lib/ajapa/types";
import { searchLocal } from "@/lib/offline/idb";
import { displayPhone } from "@/lib/offline/phone";
import {
  clearProfile,
  loadProfile,
  saveProfile,
  type LocalProfile,
} from "@/lib/offline/profile";
import { readLocalForProfile, syncAjapaFromServer } from "@/lib/offline/sync";

const STATUS_LABEL: Record<AjapaQuestion["status"], string> = {
  ai_answered: "AI उत्तर",
  escalated: "गुरुंकडे",
  guru_answered: "गुरु उत्तर",
};

const ROLE_LABEL: Record<LocalProfile["role"], string> = {
  charansevak: "चरणसेवक",
  guru: "गुरु",
  admin: "अ‍ॅडमिन",
};

export default function AjapaPage() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const syncAndLoad = useCallback(async (p: LocalProfile) => {
    setSyncing(true);
    setError(null);
    try {
      setItems(await readLocalForProfile(p));
      const result = await syncAjapaFromServer(p);
      setItems(await readLocalForProfile(p));
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
  }, []);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    void syncAndLoad(profile);
  }, [profile, syncAndLoad]);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    return searchLocal(list, query);
  }, [items, filter, query]);

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (phoneInput.replace(/\D/g, "").length < 10) {
      setError("१० अंकी मोबाइल टाका");
      return;
    }
    setProfile(saveProfile({ phone: phoneInput }));
    setError(null);
    setLoading(true);
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <InstallBanner />
        <div>
          <h2 className="text-lg font-bold">अजपा संवाद</h2>
          <p className="text-sm text-temple-muted">
            मोबाइल टाका — फक्त तुमचे प्रश्न फोनवर सेव्ह + लोकल शोध
          </p>
        </div>
        <form onSubmit={onSaveProfile} className="card space-y-3 p-4">
          <label className="block text-sm font-semibold">
            WhatsApp मोबाइल
            <input
              type="tel"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base"
              placeholder="9850120960"
              value={phoneInput}
              onChange={(ev) => setPhoneInput(ev.target.value)}
            />
          </label>
          <p className="text-xs text-temple-muted">
            गुरु फोन → गुरु इनबॉक्स · इतर → चरणसेवक (फक्त स्वतःचे)
          </p>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-saffron-700 py-2.5 text-sm font-semibold text-white"
          >
            सुरू करा
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InstallBanner />

      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">अजपा संवाद</h2>
          <p className="text-xs text-temple-muted">
            {ROLE_LABEL[profile.role]} · {displayPhone(profile.phone)}
            {offline ? " · ऑफलाइन" : ""}
          </p>
          {syncNote ? <p className="text-[11px] text-temple-muted">{syncNote}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncAndLoad(profile)}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {syncing ? "सिंक…" : "सिंक"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearProfile();
              setProfile(null);
              setItems([]);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-saffron-200"
          >
            मोबाइल बदला
          </button>
        </div>
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
        {visible.map((q) => (
          <li key={q.id} className="card space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{q.question}</p>
              <span className="shrink-0 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200">
                {STATUS_LABEL[q.status]}
              </span>
            </div>
            <p className="text-xs text-temple-muted">
              {q.seeker_name ? `${q.seeker_name} · ` : ""}
              {displayPhone(q.seeker_phone)}
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

      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">
          {query ? "शोध रिक्त" : "अजपा संवाद मध्ये प्रश्न नाहीत — सिंक करा"}
        </p>
      ) : null}
    </div>
  );
}
