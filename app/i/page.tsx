import Link from "next/link";
import { INSTALL_SLOTS, type InstallSlot } from "@/lib/installSlots";

const ORDER: InstallSlot[] = ["samvadak", "software", "charansevak"];

export default function InstallHubPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
        <h1 className="font-display text-3xl text-saffron-900">अ‍ॅप आयकॉन</h1>
        <p className="mt-2 text-sm leading-relaxed text-temple-muted">
          फोनच्या होम स्क्रीनवर तीन वेगळे आयकॉन बसवा.
          <br />
          उघडल्यावर वरचा Safari पत्ता दिसणार नाही — खरे अ‍ॅपसारखे.
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {ORDER.map((slot, idx) => {
          const cfg = INSTALL_SLOTS[slot];
          return (
            <li key={slot}>
              <Link
                href={`/i/${slot}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cfg.icon}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-temple-muted">{idx + 1} / ३</p>
                  <p className="font-semibold text-saffron-900">{cfg.name}</p>
                  <p className="text-xs text-temple-muted">{cfg.forWhom}</p>
                </div>
                <span className="text-sm font-semibold text-saffron-700">बसवा →</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 rounded-2xl bg-saffron-50 p-3 text-xs leading-relaxed text-saffron-900">
        <strong>कसे:</strong> खालील प्रत्येक लिंक उघडा → Share (□↑) →{" "}
        <strong>Add to Home Screen / होम स्क्रीनवर जोडा</strong> → Add.
        तीनदा वेगवेगळे आयकॉन येतील.
      </p>
    </div>
  );
}
