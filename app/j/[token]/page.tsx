"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type LinkInfo = {
  token: string;
  place: { id: number; name: string };
  meeting_date: string;
};

export default function JoinLinkPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token || "");
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opinion, setOpinion] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/join/${token}`)
      .then(async (res) => {
        const data = (await res.json()) as LinkInfo & { error?: string };
        if (!res.ok) throw new Error(data.error || "लिंक अवैध");
        setInfo(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "लिंक लोड नाही"));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, opinion }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "नोंद अयशस्वी");
      setDone(data.message || "नोंद झाली");
    } catch (err) {
      setError(err instanceof Error ? err.message : "नोंद अयशस्वी");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-10">
      <div className="text-center">
        <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
        <h1 className="font-display text-3xl text-saffron-900">सत्संग उपस्थिती</h1>
        <p className="mt-2 text-sm text-temple-muted">
          लिंकने नोंद = <strong>सत्संगी चरणसेवक</strong>
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {done ? (
        <div className="mt-8 space-y-3 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
          <p className="text-lg font-bold text-emerald-900">✓ सत्संगी चरणसेवक</p>
          <p className="text-sm text-emerald-900">{done}</p>
          <p className="text-xs text-temple-muted">
            पुढच्या वेळी अ‍ॅप बसवल्यास तुमचा मोबाइल वापरा
          </p>
        </div>
      ) : info ? (
        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-saffron-200">
            <p className="text-sm font-semibold text-saffron-900">{info.place.name}</p>
            <p className="text-xs text-temple-muted">गुरुवार · {info.meeting_date}</p>
          </div>
          <label className="block text-sm font-semibold">
            नाव
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2"
              placeholder="पूर्ण नाव"
            />
          </label>
          <label className="block text-sm font-semibold">
            मोबाइल
            <input
              required
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2"
              placeholder="10 अंकी"
            />
          </label>
          <label className="block text-sm font-semibold">
            या आठवड्याच्या विषयावर मत (ऐच्छिक)
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-sm"
              placeholder="थोडक्यात मत…"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-saffron-700 py-3.5 text-base font-semibold text-white disabled:opacity-50"
          >
            {busy ? "नोंद…" : "उपस्थिती + सत्संगी नोंद"}
          </button>
          <p className="text-center text-[11px] text-temple-muted">
            फक्त स्वतःची उपस्थिती · इतरांची लावता येणार नाही
          </p>
        </form>
      ) : (
        <p className="mt-8 text-center text-sm text-temple-muted">लोड…</p>
      )}
    </div>
  );
}
