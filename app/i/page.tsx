import Link from "next/link";
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
          साधारण लोकांसाठी: खालील <strong>३ बटणे</strong> दाबा.
          प्रत्येक वेळी Share → <strong>Add to Home Screen</strong> करा.
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">
        <p className="font-bold">फक्त Safari वापरा (Chrome नाही)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>खालील १ ला बटण दाबा</li>
          <li>खाली Share (□↑) दाबा</li>
          <li>
            <strong>Add to Home Screen</strong> / होम स्क्रीनवर जोडा
          </li>
          <li>Add → मग २ आणि ३ साठी परत</li>
        </ol>
      </div>

      <ol className="mt-6 space-y-3">
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

      <p className="mt-6 text-center text-xs leading-relaxed text-temple-muted">
        आयकॉन बसवल्यानंतर होम स्क्रीनवरील नवीन चिन्ह उघडा.
        <br />
        Safari टॅब नाही — म्हणजे वरचा पत्ता दिसणार नाही.
      </p>
    </div>
  );
}
