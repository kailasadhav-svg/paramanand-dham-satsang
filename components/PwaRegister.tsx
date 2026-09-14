"use client";

import { useEffect } from "react";

/** Registers /sw.js for PWA; force-activates updates so UI buttons are not stuck on old cache. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => undefined);
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => undefined);

    let refreshing = false;
    const onController = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);

  return null;
}
