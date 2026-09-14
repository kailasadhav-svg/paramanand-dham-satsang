"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("paramanand_install_dismissed") === "1";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || dismissed) return;

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIosHint(true);
      setHidden(false);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  }

  function dismiss() {
    localStorage.setItem("paramanand_install_dismissed", "1");
    setHidden(true);
  }

  return (
    <div className="card mb-3 space-y-2 border-saffron-200 bg-saffron-50/80 p-3">
      <p className="text-sm font-semibold text-saffron-900">अजपा संवाद · होम स्क्रीनवर अ‍ॅड करा</p>
      {iosHint ? (
        <p className="text-xs leading-relaxed text-temple-muted">
          Safari → Share (□↑) → <strong>Add to Home Screen</strong>
        </p>
      ) : (
        <p className="text-xs text-temple-muted">
          अ‍ॅपसारखे उघडा · ऑफलाइन यादी/शोध · सर्व्हर फक्त सिंकसाठी
        </p>
      )}
      <div className="flex gap-2">
        {deferred ? (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            इंस्टॉल
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-saffron-200"
        >
          नंतर
        </button>
      </div>
    </div>
  );
}
