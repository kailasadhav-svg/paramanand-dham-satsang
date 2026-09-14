"use client";

import { addDaysYmd, defaultThursdayYmd, formatMarathiDate } from "@/lib/dates";

export type Place = { id: number; name: string; sort_order: number; latitude?: number | null; longitude?: number | null };

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
  /** सत्संगी: फक्त घरचे स्थळ — इतर निवडता येत नाही */
  locked?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-temple-muted">
          स्थान{locked ? " · तुमचे स्थळ" : ""}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {places.map((p) => {
            const selected = placeId === p.id;
            const disabled = locked && !selected && places.length > 1;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled || (locked && places.length === 1)}
                onClick={() => {
                  if (locked && !selected) return;
                  onPlace(p.id);
                }}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                  selected
                    ? "bg-saffron-700 text-white ring-saffron-700"
                    : disabled
                      ? "cursor-not-allowed bg-stone-100 text-stone-400 ring-stone-200"
                      : "bg-white text-temple-ink ring-saffron-200"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        {locked && places.length === 1 ? (
          <p className="mt-1 text-[11px] text-temple-muted">
            तुमचे नोंदलेले स्थळ — दुसरे निवडता येणार नाही
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-xl bg-white px-3 py-2 text-lg ring-1 ring-saffron-200"
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
            className="w-full rounded-xl bg-white px-3 py-2 text-center text-sm ring-1 ring-saffron-200"
          />
          <p className="mt-1 text-xs text-temple-muted">{date ? formatMarathiDate(date) : ""}</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-white px-3 py-2 text-lg ring-1 ring-saffron-200"
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
      className={`flex items-center justify-between bg-white ring-1 ring-saffron-200 ${
        compact ? "rounded-xl px-3 py-2" : "rounded-2xl px-4 py-3"
      }`}
    >
      <span className={`font-semibold ${compact ? "text-sm" : ""}`}>{label}</span>
      <div className="flex items-center gap-1.5">
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
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{savedLabel}</p>
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
