"use client";

import { useEffect, useState } from "react";
import {
  detectBrowserKind,
  getInstallGuide,
  type InstallGuide,
} from "@/lib/browserInstall";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Shows install steps for whatever browser the person actually has. */
export function BrowserInstallGuide({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [guide, setGuide] = useState<InstallGuide | null>(null);
  const [step, setStep] = useState(1);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setGuide(getInstallGuide(detectBrowserKind()));

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!guide) {
    return (
      <p className="rounded-2xl bg-saffron-50 p-3 text-sm text-temple-muted">
        ब्राउझर ओळखत आहे…
      </p>
    );
  }

  async function installNative() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div
      className={
        compact
          ? "space-y-2 rounded-2xl bg-saffron-50 p-3 ring-1 ring-saffron-200"
          : "space-y-3 rounded-2xl bg-saffron-700 p-4 text-white"
      }
    >
      <div className={compact ? "text-saffron-900" : ""}>
        <p className={`font-bold ${compact ? "text-sm" : "text-center text-lg"}`}>
          {guide.title}
        </p>
        <p
          className={`mt-1 text-xs ${
            compact ? "text-temple-muted" : "text-center text-white/80"
          }`}
        >
          आढळले: <strong>{guide.browserLabel}</strong>
          {" · "}
          इतर ठिकाणी Chrome / Safari / Samsung असू शकते — खालील पावले त्या ब्राउझरनुसार
          आहेत.
        </p>
      </div>

      {deferred && guide.canNativeInstall ? (
        <button
          type="button"
          onClick={() => void installNative()}
          className={
            compact
              ? "w-full rounded-full bg-saffron-700 py-2.5 text-sm font-bold text-white"
              : "w-full rounded-full bg-white py-2.5 text-sm font-bold text-saffron-800"
          }
        >
          एका क्लिकने इंस्टॉल / आयकॉन बसवा
        </button>
      ) : null}

      <div className="space-y-2">
        {guide.steps.map((text, i) => (
          <button
            key={text}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm ${
              compact
                ? step === i + 1
                  ? "bg-white ring-1 ring-saffron-300"
                  : "bg-white/60"
                : step === i + 1
                  ? "bg-white/20"
                  : "bg-white/5"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                compact
                  ? "bg-saffron-700 text-white"
                  : "bg-white text-saffron-800"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`pt-0.5 font-semibold ${compact ? "text-saffron-950" : ""}`}
            >
              {text}
            </span>
          </button>
        ))}
      </div>

      {guide.tip ? (
        <p
          className={`text-xs leading-relaxed ${
            compact ? "text-temple-muted" : "text-white/85"
          }`}
        >
          {guide.tip}
        </p>
      ) : null}
    </div>
  );
}
