import { panchangTithiStub } from "@/lib/panchang";
import { PANCHANG_TITHI_HELP } from "@/lib/labels";

/** Top-of-Thursday-screen Marathi tithi (panchang stub) + week number. */
export function ThursdayTithiBar({ ymd }: { ymd: string }) {
  const stub = panchangTithiStub(ymd);
  return (
    <div className="rounded-xl bg-saffron-50 px-3 py-2 text-[11px] leading-relaxed text-saffron-900">
      <p className="font-semibold">{stub.line}</p>
      <p className="mt-0.5 text-temple-muted">{PANCHANG_TITHI_HELP}</p>
    </div>
  );
}
