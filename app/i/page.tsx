"use client";

import Link from "next/link";
import { BrowserInstallGuide } from "@/components/BrowserInstallGuide";
import { INSTALL_SLOTS, type InstallSlot } from "@/lib/installSlots";

const ORDER: InstallSlot[] = ["samvadak", "software", "charansevak"];

export default function InstallHubPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
        <h1 className="font-display text-3xl text-saffron-900">३ अ‍ॅप आयकॉन</h1>
        <p className="mt-3 text-base font-semibold leading-snug text-saffron-900">
          वरचा लिंक / पत्ता अ‍ॅपमध्ये दिसणार नाही
        </p>
        <p className="mt-2 text-sm leading-relaxed text-temple-muted">
          वेगवेगळ्या ठिकाणी Chrome, Safari, Samsung किंवा इतर ब्राउझर असू शकतो.
          खालील सूचना <strong>तुमच्या ब्राउझरनुसार</strong> दिसतात.
        </p>
      </div>

      <div className="mt-5">
        <BrowserInstallGuide compact />
      </div>

      <p className="mt-5 text-center text-sm font-bold text-saffron-900">
        आता तिन्ही आयकॉन बसवा ↓
      </p>

      <ol className="mt-3 space-y-3">
        {ORDER.map((slot, idx) => {
          const cfg = INSTALL_SLOTS[slot];
          return (
            <li key={slot}>
              <Link
                href={`/i/${slot}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-2 ring-saffron-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cfg.icon}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-saffron-700">
                    पाऊल {idx + 1} / ३
                  </p>
                  <p className="text-lg font-bold text-saffron-900">{cfg.shortName}</p>
                  <p className="text-xs text-temple-muted">{cfg.forWhom}</p>
                </div>
                <span className="rounded-full bg-saffron-700 px-3 py-2 text-sm font-bold text-white">
                  उघडा
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-2 rounded-2xl bg-white p-3 text-xs leading-relaxed text-temple-muted ring-1 ring-saffron-100">
        <p className="font-semibold text-saffron-900">इतर ठिकाणी लक्षात ठेवा</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>iPhone:</strong> Safari वापरा (Chrome असल्यास «Open in Safari»)
          </li>
          <li>
            <strong>Android Chrome:</strong> ⋮ → Install app / Add to Home screen
          </li>
          <li>
            <strong>Samsung:</strong> मेनू → Add page to → Home screen
          </li>
        </ul>
        <p>
          आयकॉन बसवल्यानंतर होम स्क्रीनवरील चिन्ह उघडा — ब्राउझर टॅब नाही.
        </p>
      </div>
    </div>
  );
}
