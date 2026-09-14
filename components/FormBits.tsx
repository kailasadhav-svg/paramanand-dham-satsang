"use client";

import { addDaysYmd, defaultThursdayYmd, formatMarathiDate } from "@/lib/dates";

export type Place = {
  id: number;
  name: string;
  sort_order: number;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Place + date controls.
 * Place is always a full-width <select> on phone and computer —
 * no horizontal chips that clip Marathi names (e.g. नाशिक).
 */
export function PlaceDateBar({
  places,
  placeId,
  date,
  onPlace,
  onDate,
  locked = false,
}: {
  places: Place[];
  placeId: number | "";
  date: string;
  onPlace: (id: number) => void;
  onDate: (ymd: string) => void;
  locked?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-temple-muted">
          स्थान
        </label>
        <select
          disabled={locked || places.length === 0}
          value={placeId === "" ? "" : String(placeId)}
          onChange={(e) => {
            const id = Number(e.target.value);
            if (Number.isFinite(id)) onPlace(id);
          }}
          className="w-full min-w-0 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold leading-normal ring-1 ring-saffron-200 disabled:opacity-60"
          aria-label="स्थान निवडा"
        >
          {places.length === 0 ? <option value="">स्थळ नाही</option> : null}
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="shrink-0 rounded-xl bg-white px-3 py-2 text-lg ring-1 ring-saffron-200"
          onClick={() => onDate(addDaysYmd(date || defaultThursdayYmd(), -7))}
          aria-label="मागील गुरुवार"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <input
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-white px-3 py-2 text-center text-sm ring-1 ring-saffron-200"
          />
          <p className="mt-1 break-words text-xs leading-snug text-temple-muted">
            {date ? formatMarathiDate(date) : ""}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-xl bg-white px-3 py-2 text-lg ring-1 ring-saffron-200"
          onClick={() => onDate(addDaysYmd(date || defaultThursdayYmd(), 7))}
          aria-label="पुढील गुरुवार"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function NumberStepper({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 bg-white ring-1 ring-saffron-200 ${
        compact ? "rounded-xl px-3 py-2" : "rounded-2xl px-4 py-3"
      }`}
    >
      <span
        className={`min-w-0 break-words font-semibold leading-snug ${compact ? "text-sm" : ""}`}
      >
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`${label} कमी`}
          className={`${compact ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl"} rounded-full bg-saffron-100 font-bold text-saffron-800`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          aria-label={`${label} एडिट`}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
          }}
          className={`${compact ? "h-9 w-12 text-base" : "h-11 w-14 text-lg"} rounded-xl bg-saffron-50 text-center font-bold tabular-nums ring-1 ring-saffron-200`}
        />
        <button
          type="button"
          aria-label={`${label} वाढ`}
          className={`${compact ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl"} rounded-full bg-saffron-700 font-bold text-white`}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SaveBar({
  saving,
  saved,
  error,
  onSave,
  label = "जतन करा",
  savedLabel = "जतन झाले · पुन्हा दुरुस्ती करता येईल",
  sticky = false,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  label?: string;
  savedLabel?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={`space-y-2 ${
        sticky
          ? "sticky bottom-[4.5rem] z-20 -mx-1 border-t border-saffron-100 bg-temple-cream/95 px-1 pb-2 pt-2 backdrop-blur"
          : ""
      }`}
    >
      {error ? (
        <p className="break-words rounded-xl bg-red-50 px-3 py-2 text-sm leading-snug text-red-800">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="break-words rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-snug text-emerald-800">
          {savedLabel}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-2xl bg-saffron-700 py-3.5 text-base font-semibold text-white disabled:opacity-60"
      >
        {saving ? "जतन होत आहे…" : label}
      </button>
    </div>
  );
}
