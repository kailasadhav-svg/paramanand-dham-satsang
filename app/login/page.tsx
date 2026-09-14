"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(nextPin: string) {
    if (nextPin.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nextPin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "प्रवेश अयशस्वी");
        setPin("");
        return;
      }
      router.replace("/attendance");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function press(digit: string) {
    const next = (pin + digit).slice(0, 8);
    setPin(next);
    setError(null);
    if (next.length === 4) void submit(next);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
        <h1 className="mt-1 font-display text-4xl text-saffron-900">अजपा संवाद</h1>
        <p className="mt-2 text-sm text-temple-muted">
          चरणसेवक · गुरु प्रश्नोत्तर · होम स्क्रीन अ‍ॅप
        </p>
      </div>

      <div className="mt-10 card px-5 py-6">
        <p className="text-center text-sm font-semibold">प्रशासक पिन</p>
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-saffron-700" : "bg-saffron-200"}`}
            />
          ))}
        </div>
        {error ? <p className="mt-3 text-center text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => press(d)}
              className="rounded-2xl bg-saffron-50 py-4 text-xl font-bold text-saffron-900"
            >
              {d}
            </button>
          ))}
          <button type="button" onClick={backspace} className="rounded-2xl bg-white py-4 text-sm font-semibold ring-1 ring-saffron-200">
            ⌫
          </button>
          <button type="button" onClick={() => press("0")} className="rounded-2xl bg-saffron-50 py-4 text-xl font-bold">
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => void submit(pin)}
            className="rounded-2xl bg-saffron-700 py-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-temple-muted">
        सुपर अॅडमिन: मधुसुदनदास विजयानंद · 9850120960
        <br />
        सॉफ्टवेअर: KAILAS ADHAV · 9225118811
      </p>
    </div>
  );
}
