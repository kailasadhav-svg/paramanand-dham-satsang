"use client";

import { useEffect } from "react";

/** Registers /sw.js for PWA / Add to Home Screen; refreshes when a new SW waits. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const run = () => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Prefer the newest SW so stale HTML shells are dropped quickly.
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          reg.update().catch(() => undefined);
        })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run);
    return () => window.removeEventListener("load", run);
  }, []);
  return null;
}
