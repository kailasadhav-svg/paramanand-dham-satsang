"use client";

import { addDaysYmd, defaultThursdayYmd, formatMarathiDate } from "@/lib/dates";

export type Place = { id: number; name: string; sort_order: number; latitude?: number | null; longitude?: number | null };

export function PlaceDateBar({
  places,
  placeId,
  date,
  onPlace,
  onDate,
}: {
  places: Place[];
  placeId: number | "";
  date: string;
  onPlace: (id: number) => void;
  onDate: (ymd: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-temple-muted">स्थान</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlace(p.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                placeId === p.id
                  ? "bg-saffron-700 text-white ring-saffron-700"
                  : "bg-white text-temple-ink ring-saffron-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-saffron-200">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-saffron-100 text-xl font-bold text-saffron-800"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-saffron-700 text-xl font-bold text-white"
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
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">जतन झाले</p>
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
