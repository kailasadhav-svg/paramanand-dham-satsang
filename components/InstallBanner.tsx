"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfileOptional } from "@/components/PhoneGate";
import { detectBrowserKind, getInstallGuide } from "@/lib/browserInstall";
import { profileAppName } from "@/lib/offline/profile";
import { INSTALL_SLOTS, type InstallSlot } from "@/lib/installSlots";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function slotForRole(role: string | undefined): InstallSlot {
  if (role === "software") return "software";
  if (role === "charansevak") return "charansevak";
  return "samvadak";
}

export function InstallBanner() {
  const profile = useProfileOptional();
  const appName = profileAppName(profile);
  const slot = slotForRole(profile?.role);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [hint, setHint] = useState("");

  useEffect(() => {
    const dismissed = localStorage.getItem("paramanand_install_dismissed") === "1";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || dismissed) return;

    const guide = getInstallGuide(detectBrowserKind());
    setHint(`${guide.browserLabel}: ${guide.steps[0]} → ${guide.steps[1]}`);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    setHidden(false);
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
    <div className="mb-3 space-y-2 rounded-2xl border border-saffron-200 bg-saffron-50/90 p-3">
      <p className="text-sm font-semibold text-saffron-900">
        {appName} · फोनवर अ‍ॅप आयकॉन बसवा
      </p>
      <p className="text-xs leading-relaxed text-temple-muted">
        {hint || "ब्राउझरनुसार होम स्क्रीनवर जोडा."} · तिन्ही आयकॉन:{" "}
        <Link href="/i" className="font-semibold text-saffron-800 underline">
          येथे
        </Link>{" "}
        · हा:{" "}
        <Link href={`/i/${slot}`} className="font-semibold text-saffron-800 underline">
          {INSTALL_SLOTS[slot].shortName}
        </Link>
      </p>
      <div className="flex flex-wrap gap-2">
        {deferred ? (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            इंस्टॉल
          </button>
        ) : (
          <Link
            href={`/i/${slot}`}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            आयकॉन बसवा
          </Link>
        )}
        <Link
          href="/i"
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-saffron-200"
        >
          तिन्ही आयकॉन
        </Link>
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
