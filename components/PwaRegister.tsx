"use client";

import { useEffect } from "react";

/** Registers /sw.js for PWA / Add to Home Screen. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const run = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run);
    return () => window.removeEventListener("load", run);
  }, []);
  return null;
}
