"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";

function MemberLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mobile, setMobile] = useState(params.get("mobile") || "");
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/member-login", {
        method: "POST",
        body: JSON.stringify({ mobile, login_code: loginCode }),
      });
      router.replace("/me");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "प्रवेश अयशस्वी");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
      <p className="text-center text-sm font-semibold text-saffron-700">श्री परमानंद धाम</p>
      <h1 className="mt-1 text-center font-display text-3xl text-saffron-900">
        परमानंद चरणसेवक प्रवेश
      </h1>
      <p className="mt-2 text-center text-sm text-temple-muted">मोबाइल + प्रवेश संकेत</p>

      <form onSubmit={(e) => void submit(e)} className="card mt-8 space-y-4 px-5 py-6">
        <label className="block text-xs font-semibold text-temple-muted">
          मोबाइल
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
          प्रवेश संकेत
          <input
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-base tabular-nums tracking-widest ring-1 ring-saffron-200"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-saffron-700 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "तपासणी…" : "प्रवेश"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/register" className="font-semibold text-saffron-800">
          अजपा · ajpa
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

export default function MemberLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-6 py-10 text-center text-sm text-temple-muted">
          लोड…
        </div>
      }
    >
      <MemberLoginForm />
    </Suspense>
  );
}
