"use client";

import Link from "next/link";
import { useState } from "react";
import { AJPA_LABEL, AJPA_MR, applyRegisterReply, type RegisterChatStep, type RegisterDraft } from "@/lib/ajpa";
import { api } from "@/lib/api";
import { PLACE_OPTIONS } from "@/lib/places";

type Registered = {
  id: number;
  name: string;
  mobile: string;
  place_label: string;
  login_code: string;
  login_code_collision: boolean;
};

export default function RegisterPage() {
  const [step, setStep] = useState<RegisterChatStep>("ask_name");
  const [draft, setDraft] = useState<RegisterDraft>({});
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Registered | null>(null);

  async function finish(next: RegisterDraft) {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ member: Registered }>("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: next.name,
          mobile: next.mobile,
          place_code: next.place_code,
        }),
      });
      setDone(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "अजपा अयशस्वी");
    } finally {
      setLoading(false);
    }
  }

  function advance(text: string) {
    const next = applyRegisterReply(step, text, draft);
    setError(next.error ?? null);
    setDraft(next.draft);
    if (next.error) return;
    setReply("");
    if (next.step === "done" && next.draft.name && next.draft.mobile && next.draft.place_code) {
      void finish(next.draft);
      return;
    }
    setStep(next.step);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "ask_place") {
      if (!reply) {
        setError("स्थान निवडा");
        return;
      }
    }
    advance(reply);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
        <p className="text-center text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
        <h1 className="mt-1 text-center font-display text-3xl text-saffron-900">{AJPA_MR}</h1>
        <p className="mt-1 text-center text-sm text-temple-muted">पूर्ण · ajpa</p>
        <div className="card mt-8 space-y-3 px-5 py-6">
          <p className="text-sm text-temple-muted">{done.name} · {done.place_label}</p>
          <div className="rounded-2xl bg-saffron-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-temple-muted">चरणसेवक क्रमांक</p>
            <p className="text-3xl font-bold text-saffron-800">{done.id}</p>
          </div>
          <div className="rounded-2xl bg-saffron-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-temple-muted">प्रवेश संकेत</p>
            <p className="text-3xl font-bold tracking-widest text-saffron-800">{done.login_code}</p>
          </div>
          {done.login_code_collision ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              मोबाइलच्या शेवटच्या ४ अंकांचा संकेत आधी वापरला होता. तुम्हाला नवीन ६-अंकी संकेत दिला आहे. हा संकेत जपून ठेवा.
            </p>
          ) : (
            <p className="text-center text-xs text-temple-muted">
              संकेत = मोबाइलचे शेवटचे ४ अंक
            </p>
          )}
        </div>
        <Link
          href={`/member-login?mobile=${encodeURIComponent(done.mobile)}`}
          className="mt-6 rounded-2xl bg-saffron-700 py-3.5 text-center font-semibold text-white"
        >
          प्रवेश करा
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
      <p className="text-center text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
      <h1 className="mt-1 text-center font-display text-3xl text-saffron-900">{AJPA_MR}</h1>
      <p className="mt-2 text-center text-sm text-temple-muted">{AJPA_LABEL}</p>
      <p className="mt-1 text-center text-xs text-temple-muted">नाव · मोबाइल · स्थान — एक एक करून</p>

      <form onSubmit={submit} className="card mt-8 space-y-4 px-5 py-6">
        {step === "ask_name" ? (
          <label className="block text-xs font-semibold text-temple-muted">
            नाव
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              autoComplete="name"
              autoFocus
              required
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base ring-1 ring-saffron-200"
            />
          </label>
        ) : null}
        {step === "ask_mobile" ? (
          <label className="block text-xs font-semibold text-temple-muted">
            मोबाइल (१० अंक)
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              required
              className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base tabular-nums ring-1 ring-saffron-200"
            />
          </label>
        ) : null}
        {step === "ask_place" ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-temple-muted">स्थान</p>
            <div className="flex flex-wrap gap-2">
              {PLACE_OPTIONS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => advance(p.label)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                    reply === p.label
                      ? "bg-saffron-700 text-white ring-saffron-700"
                      : "bg-white ring-saffron-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {step !== "ask_place" ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-saffron-700 py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "…" : "पुढे"}
          </button>
        ) : (
          <p className="text-center text-xs text-temple-muted">स्थान टॅप करा</p>
        )}
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/member-login" className="font-semibold text-saffron-800">
          आधी {AJPA_MR}? प्रवेश करा
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/login" className="text-temple-muted">
          प्रवेश पिन
        </Link>
      </p>
    </div>
  );
}
