"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [placeCode, setPlaceCode] = useState(PLACE_OPTIONS[0]?.code ?? "ranantri");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Registered | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ member: Registered }>("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, mobile, place_code: placeCode }),
      });
      setDone(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "नोंदणी अयशस्वी");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
        <p className="text-center text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
        <h1 className="mt-1 text-center font-display text-3xl text-saffron-900">नोंदणी पूर्ण</h1>
        <div className="card mt-8 space-y-3 px-5 py-6">
          <p className="text-sm text-temple-muted">{done.name} · {done.place_label}</p>
          <div className="rounded-2xl bg-saffron-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-temple-muted">सेवक क्रमांक</p>
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
      <h1 className="mt-1 text-center font-display text-3xl text-saffron-900">चरणसेवक नोंदणी</h1>
      <p className="mt-2 text-center text-sm text-temple-muted">नाव · मोबाइल · स्थान</p>

      <form onSubmit={(e) => void submit(e)} className="card mt-8 space-y-4 px-5 py-6">
        <label className="block text-xs font-semibold text-temple-muted">
          नाव
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base ring-1 ring-saffron-200"
          />
        </label>
        <label className="block text-xs font-semibold text-temple-muted">
          मोबाइल (१० अंक)
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="tel"
            required
            className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base tabular-nums ring-1 ring-saffron-200"
          />
        </label>
        <label className="block text-xs font-semibold text-temple-muted">
          स्थान
          <select
            value={placeCode}
            onChange={(e) => setPlaceCode(e.target.value as typeof placeCode)}
            className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base ring-1 ring-saffron-200"
          >
            {PLACE_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-saffron-700 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "नोंद होत आहे…" : "नोंदणी करा"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/member-login" className="font-semibold text-saffron-800">
          आधी नोंद आहे? प्रवेश करा
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/login" className="text-temple-muted">
          प्रशासक पिन
        </Link>
      </p>
    </div>
  );
}
