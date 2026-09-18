"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { loadProfile } from "@/lib/offline/profile";
import { defaultHomePath } from "@/lib/roles";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
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
      const nextRaw = search.get("next");
      const profile = loadProfile();
      const nextSafe =
        nextRaw &&
        nextRaw.startsWith("/") &&
        !nextRaw.startsWith("//") &&
        !nextRaw.includes("\\") &&
        !nextRaw.includes("@")
          ? nextRaw
          : null;
      const dest = nextSafe
        ? nextSafe
        : profile
          ? defaultHomePath(profile.role)
          : "/ajapa";
      router.replace(dest);
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
      {/* Critical keypad layout if CSS chunk fails to load (avoids single wrapping row). */}
      <style>{`
        .pin-pad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.75rem;margin-top:1.5rem}
        .pin-pad button{border:0;border-radius:1rem;padding:1rem 0;font-size:1.25rem;font-weight:700;background:#fff7ed;color:#7c2d12}
        .pin-pad button.pin-ok{background:#c74407;color:#fff;font-size:0.875rem}
        .pin-pad button.pin-ok:disabled{opacity:0.5}
        .pin-pad button.pin-back{background:#fff;font-size:0.875rem;box-shadow:inset 0 0 0 1px #fed7aa}
      `}</style>
      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
        <h1 className="mt-1 font-display text-4xl text-saffron-900">अजपा संवाद</h1>
        <p className="mt-2 text-sm text-temple-muted">
          मोबाइलनुसार स्क्रीन · संगणक / मार्गदर्शक / चरणसेवक
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
        <div className="pin-pad mt-6 grid grid-cols-3 gap-3">
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
          <button
            type="button"
            onClick={backspace}
            className="pin-back rounded-2xl bg-white py-4 text-sm font-semibold ring-1 ring-saffron-200"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className="rounded-2xl bg-saffron-50 py-4 text-xl font-bold"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => void submit(pin)}
            className="pin-ok rounded-2xl bg-saffron-700 py-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
        <Link href="/register" className="text-saffron-800">
          अजपा · ajpa
        </Link>
        <Link href="/member-login" className="text-saffron-800">
          परमानंद चरणसेवक प्रवेश
        </Link>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-temple-muted">
        मार्गदर्शक: मधुसुदनदास · 9850120960
        <br />
        संगणक: कैलास आढाव · 9225118811
        <br />
        चरणसेवक (कैलास): 9423078811 · shortcut: परमानंद चरणसेवक
        <br />
        चरणसेवक (मधुसुदनदास): 9136443333
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-temple-muted">लोड…</p>}>
      <LoginForm />
    </Suspense>
  );
}
