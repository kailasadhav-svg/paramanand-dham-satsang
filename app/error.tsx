"use client";

import { useEffect } from "react";

/** Catches client render crashes and offers a clear Marathi recovery path. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
      <h1 className="font-display text-3xl text-saffron-900">अ‍ॅप पुन्हा उघडा</h1>
      <p className="text-sm leading-relaxed text-temple-muted">
        तात्पुरती लिंक / जुना कॅशे यामुळे स्क्रीन अडू शकते. खालील बटण दाबा — किंवा होम
        स्क्रीनवरील आयकॉन बंद करून पुन्हा उघडा.
      </p>
      <button
        type="button"
        onClick={() => {
          if ("serviceWorker" in navigator) {
            void navigator.serviceWorker.getRegistrations().then((regs) => {
              for (const r of regs) void r.unregister();
            });
          }
          if ("caches" in window) {
            void caches.keys().then((keys) => {
              for (const k of keys) void caches.delete(k);
            });
          }
          reset();
          window.location.assign("/i");
        }}
        className="w-full rounded-2xl bg-saffron-700 py-3.5 text-base font-semibold text-white"
      >
        कॅशे साफ · आयकॉन पान उघडा
      </button>
      <button
        type="button"
        onClick={() => reset()}
        className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-saffron-900 ring-1 ring-saffron-200"
      >
        पुन्हा प्रयत्न
      </button>
    </div>
  );
}
