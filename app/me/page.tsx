"use client";

import { useEffect, useState } from "react";
import { AJPA_LABEL } from "@/lib/ajpa";
import { api } from "@/lib/api";
import { ThursdayTithiBar } from "@/components/ThursdayTithiBar";
import { chintanDeadlineYmd, formatMarathiDate } from "@/lib/dates";
import {
  CHINTAN_DEADLINE_HELP,
  CHINTAN_LABEL,
  CHINTAN_MISSING_REMINDER,
  CHINTAN_WRITE_PLACEHOLDER,
  TOPIC_THURSDAY_HELP,
} from "@/lib/labels";

type MePayload = {
  member: {
    id: number;
    name: string;
    mobile: string;
    place_label: string;
    login_code: string;
    login_code_collision: boolean;
  };
  weekly: {
    week_start: string;
    question: { question: string; source: string | null } | null;
    answer: { answer: string } | null;
  };
};

export default function MemberHomePage() {
  const [data, setData] = useState<MePayload | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const next = await api<MePayload>("/api/me");
    setData(next);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, []);

  async function submitChintan() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/me/answer", {
        method: "POST",
        body: JSON.stringify({ answer: draft }),
      });
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "चिंतन जतन अयशस्वी");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-temple-muted">{error || "लोड होत आहे…"}</p>;
  }

  const { member, weekly } = data;
  const deadline = formatMarathiDate(chintanDeadlineYmd(weekly.week_start));

  return (
    <div className="space-y-4">
      <ThursdayTithiBar ymd={weekly.week_start} />
      <div className="card space-y-2 p-4">
        <p className="text-sm text-temple-muted">नमस्कार</p>
        <h2 className="text-xl font-bold">{member.name}</h2>
        <p className="text-sm text-temple-muted">{member.place_label}</p>
        <dl className="grid grid-cols-2 gap-2 pt-2 text-sm">
          <div className="rounded-xl bg-saffron-50 px-3 py-2">
            <dt className="text-xs text-temple-muted">चरणसेवक क्रमांक</dt>
            <dd className="font-bold text-saffron-800">{member.id}</dd>
          </div>
          <div className="rounded-xl bg-saffron-50 px-3 py-2">
            <dt className="text-xs text-temple-muted">प्रवेश संकेत</dt>
            <dd className="font-bold tracking-widest text-saffron-800">{member.login_code}</dd>
          </div>
        </dl>
        {member.login_code_collision ? (
          <p className="text-xs text-amber-800">तुमचा संकेत ६-अंकी आहे (शेवटचे ४ अंक आधी वापरले होते).</p>
        ) : null}
      </div>

      <div className="card space-y-3 p-4">
        <h3 className="font-bold">या आठवड्याचा विषय</h3>
        <p className="text-xs leading-relaxed text-temple-muted">{TOPIC_THURSDAY_HELP}</p>
        <p className="text-xs leading-relaxed text-temple-muted">
          {CHINTAN_DEADLINE_HELP} मुदत: {deadline} रात्री १२:००.
        </p>
        {weekly.question ? (
          <>
            <p className="leading-relaxed">{weekly.question.question}</p>
            {weekly.question.source ? (
              <p className="text-xs text-temple-muted">स्रोत: {weekly.question.source}</p>
            ) : null}
            {weekly.answer ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                <p className="text-xs font-semibold text-emerald-800">तुमचे {CHINTAN_LABEL}</p>
                <p className="mt-1 whitespace-pre-wrap">{weekly.answer.answer}</p>
              </div>
            ) : (
              <>
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {CHINTAN_MISSING_REMINDER}
                </p>
                <label className="block text-xs font-semibold text-temple-muted">
                  {CHINTAN_LABEL}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    placeholder={CHINTAN_WRITE_PLACEHOLDER}
                    aria-label={CHINTAN_LABEL}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm font-normal text-temple-ink ring-1 ring-saffron-200"
                  />
                </label>
                <button
                  type="button"
                  disabled={saving || !draft.trim()}
                  onClick={() => void submitChintan()}
                  className="w-full rounded-2xl bg-saffron-700 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "पाठवत आहे…" : "चिंतन पाठवा"}
                </button>
                <p className="text-xs text-temple-muted">
                  एकदा पाठवलेले चिंतन बदलता येत नाही. {AJPA_LABEL} + चिंतन
                </p>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-temple-muted">
            या आठवड्याचा विषय अद्याप नाही. मधुसुदनदास गुरुवारी विषय देतील तेव्हा इथे दिसेल.
          </p>
        )}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
