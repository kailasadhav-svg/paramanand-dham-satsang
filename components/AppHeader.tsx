"use client";

import { useRouter } from "next/navigation";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-saffron-200/70 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-saffron-700">परमानंद धाम</p>
          <h1 className="font-display text-2xl leading-tight text-saffron-900">अजपा संवाद</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-temple-muted">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-saffron-200 px-3 py-1.5 text-xs font-semibold text-saffron-800"
        >
          बाहेर पडा
        </button>
      </div>
    </header>
  );
}
