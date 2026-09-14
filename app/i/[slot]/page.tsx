"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BrowserInstallGuide } from "@/components/BrowserInstallGuide";
import { clearProfile, saveProfile } from "@/lib/offline/profile";
import { defaultHomePath } from "@/lib/roles";
import { INSTALL_SLOTS, isInstallSlot } from "@/lib/installSlots";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export default function InstallSlotPage() {
  const params = useParams<{ slot: string }>();
  const router = useRouter();
  const slotKey = String(params.slot || "").toLowerCase();
  const cfg = isInstallSlot(slotKey) ? INSTALL_SLOTS[slotKey] : null;
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
  }, []);

  useEffect(() => {
    if (!cfg) return;

    let manifest = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifest) {
      manifest = document.createElement("link");
      manifest.rel = "manifest";
      document.head.appendChild(manifest);
    }
    manifest.href = cfg.manifest;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-title", cfg.shortName);
    ensureMeta("theme-color", cfg.theme);
    document.title = cfg.shortName;

    let apple = document.querySelector(
      'link[rel="apple-touch-icon"]',
    ) as HTMLLinkElement | null;
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = cfg.appleIcon;

    clearProfile();
    saveProfile({ phone: cfg.phone });
  }, [cfg]);

  useEffect(() => {
    if (!cfg || !standalone) return;
    const home = defaultHomePath(cfg.role);
    router.replace(`/login?next=${encodeURIComponent(home)}&role=${cfg.testRole}`);
  }, [cfg, standalone, router]);

  if (!cfg) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-semibold text-saffron-900">अज्ञात आयकॉन</p>
        <Link href="/i" className="mt-3 inline-block text-sm text-saffron-700 underline">
          ← तिन्ही आयकॉन
        </Link>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cfg.icon} alt="" className="h-24 w-24 rounded-3xl shadow" />
        <p className="mt-4 font-display text-3xl text-saffron-900">{cfg.shortName}</p>
        <p className="mt-2 text-sm text-temple-muted">अ‍ॅप उघडत आहे…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cfg.icon}
          alt=""
          className="mx-auto h-28 w-28 rounded-[1.75rem] shadow-lg ring-1 ring-black/5"
        />
        <p className="mt-4 text-sm font-semibold text-saffron-700">परमानंद धाम</p>
        <h1 className="font-display text-4xl text-saffron-900">{cfg.shortName}</h1>
        <p className="mt-1 text-sm text-temple-muted">{cfg.forWhom}</p>
      </div>

      <div className="mt-6">
        <BrowserInstallGuide />
      </div>

      <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm font-semibold leading-relaxed text-amber-950 ring-1 ring-amber-200">
        आयकॉन उघडल्यावर वरचा लिंक दिसणार नाही.
        <br />
        सामान्य लोकांना फक्त अ‍ॅप दिसेल — ब्राउझर नाही.
      </p>

      <div className="mt-4 space-y-2">
        <a
          href={`/t/${cfg.testRole}`}
          className="block w-full rounded-2xl bg-saffron-700 py-4 text-center text-base font-bold text-white"
        >
          आयकॉन बसवल्यानंतर सुरू करा
        </a>
        <Link
          href="/i"
          className="block w-full rounded-2xl bg-white py-3 text-center text-sm font-semibold text-saffron-900 ring-1 ring-saffron-200"
        >
          ← पुढचा आयकॉन बसवा
        </Link>
      </div>
    </div>
  );
}
