"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
    document.title = cfg.name;

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

  const steps = useMemo(
    () => [
      "खालील Share बटण (□↑) दाबा",
      "«Add to Home Screen» / «होम स्क्रीनवर जोडा» निवडा",
      "नाव तपासा → Add / जोडा",
      "होम स्क्रीनवरील नवीन आयकॉन उघडा — वरचा पत्ता दिसणार नाही",
    ],
    [],
  );

  if (!cfg) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-semibold text-saffron-900">अज्ञात आयकॉन</p>
        <Link href="/i" className="mt-3 inline-block text-sm text-saffron-700 underline">
          तिन्ही आयकॉन यादी
        </Link>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cfg.icon} alt="" className="h-20 w-20 rounded-3xl" />
        <p className="mt-4 font-display text-2xl text-saffron-900">{cfg.name}</p>
        <p className="mt-1 text-sm text-temple-muted">अ‍ॅप उघडत आहे…</p>
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
          className="mx-auto h-24 w-24 rounded-[1.75rem] shadow-md ring-1 ring-black/5"
        />
        <p className="mt-4 text-sm font-semibold text-saffron-700">परमानंद धाम</p>
        <h1 className="font-display text-3xl text-saffron-900">{cfg.name}</h1>
        <p className="mt-1 text-sm text-temple-muted">{cfg.forWhom}</p>
        <p className="mt-1 text-xs text-temple-muted">मोबाइल {cfg.phone}</p>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-saffron-200">
        <p className="text-sm font-bold text-saffron-900">होम स्क्रीनवर आयकॉन बसवा</p>
        <p className="text-xs leading-relaxed text-temple-muted">
          साधारण लोकांसाठी: फक्त खालील ४ पावले. ब्राउझरचा वरचा पत्ता अ‍ॅपमध्ये दिसणार
          नाही.
        </p>
        <ol className="space-y-2 text-sm text-temple-ink">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saffron-700 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 space-y-2">
        <a
          href={`/t/${cfg.testRole}`}
          className="block w-full rounded-2xl bg-saffron-700 py-3.5 text-center text-base font-semibold text-white"
        >
          आयकॉन बसवल्यानंतर सुरू करा
        </a>
        <Link
          href="/i"
          className="block w-full rounded-2xl bg-saffron-50 py-3 text-center text-sm font-semibold text-saffron-900 ring-1 ring-saffron-200"
        >
          ← तिन्ही आयकॉन
        </Link>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-temple-muted">
        Android: मेनू ⋮ → «Install app» / «होम स्क्रीनवर जोडा»
        <br />
        iPhone: Safari Share → Add to Home Screen
      </p>
    </div>
  );
}
