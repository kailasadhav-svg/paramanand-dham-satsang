"use client";

import type { Place } from "./FormBits";
import { vahakDutyPersonLabel } from "@/lib/labels";

export type DutyPerson = {
  charansevak_phone: string;
  charansevak_name: string | null;
  charansevak_phone_display: string;
} | null;

export type DutyDraft = { phone: string; name: string };

export function DutyAppointSection({
  title,
  help,
  places,
  selectedPlaceId,
  onSelectPlace,
  dutyByPlaceId,
  drafts,
  onDraftChange,
  onSave,
  busyPlaceId,
  message,
  ariaLabel = "नेमणूक स्थळ निवडा",
  primary = false,
}: {
  title: string;
  help: string;
  places: Place[];
  selectedPlaceId: number | "";
  onSelectPlace: (id: number | "") => void;
  dutyByPlaceId: Record<number, DutyPerson>;
  drafts: Record<number, DutyDraft>;
  onDraftChange: (placeId: number, draft: DutyDraft) => void;
  onSave: (place: Place) => void;
  busyPlaceId: number | null;
  message: string | null;
  ariaLabel?: string;
  primary?: boolean;
}) {
  const selected = places.find((p) => p.id === selectedPlaceId) || null;
  const draft = selected
    ? drafts[selected.id] || { phone: "", name: "" }
    : { phone: "", name: "" };
  const others = places.filter((p) => p.id !== selectedPlaceId);

  return (
    <section
      className={`space-y-3 rounded-2xl p-3 ${
        primary
          ? "bg-saffron-50 ring-2 ring-saffron-400"
          : "bg-white ring-1 ring-saffron-200"
      }`}
    >
      <h3 className={`font-bold text-saffron-900 ${primary ? "text-base" : "text-sm"}`}>
        {title}
      </h3>
      <p className="text-[11px] text-temple-muted">{help}</p>
      <label className="block text-xs font-semibold text-temple-muted">
        नेमणूक स्थळ (ड्रॉपडाउन)
      </label>
      <select
        value={selectedPlaceId === "" ? "" : String(selectedPlaceId)}
        onChange={(e) => {
          const id = Number(e.target.value);
          onSelectPlace(Number.isFinite(id) ? id : "");
        }}
        className="w-full min-w-0 rounded-xl bg-saffron-50 px-3 py-2.5 text-sm font-semibold ring-1 ring-saffron-200"
        aria-label={ariaLabel}
      >
        {places.length === 0 ? <option value="">स्थळ नाही</option> : null}
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name} · {vahakDutyPersonLabel(dutyByPlaceId[place.id] ?? null)}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="space-y-2 rounded-xl bg-saffron-50/50 p-3">
          <p className="text-sm font-semibold">{selected.name}</p>
          <input
            type="text"
            placeholder="नाव"
            value={draft.name}
            onChange={(e) =>
              onDraftChange(selected.id, { ...draft, name: e.target.value })
            }
            className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="मोबाइल"
            value={draft.phone}
            onChange={(e) =>
              onDraftChange(selected.id, { ...draft, phone: e.target.value })
            }
            className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <button
            type="button"
            disabled={busyPlaceId === selected.id}
            onClick={() => onSave(selected)}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busyPlaceId === selected.id ? "जतन…" : "नेमणूक दुरुस्त / जतन"}
          </button>
        </div>
      ) : null}
      {others.length > 0 ? (
        <div className="space-y-1 border-t border-saffron-100 pt-2">
          <p className="text-[11px] font-semibold text-temple-muted">
            इतर स्थळांच्या नेमणुका
          </p>
          <ul className="space-y-0.5">
            {others.map((place) => (
              <li
                key={place.id}
                className="break-words text-[11px] leading-snug text-temple-muted"
              >
                {place.name} — {vahakDutyPersonLabel(dutyByPlaceId[place.id] ?? null)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {message ? (
        <p className="text-xs font-semibold text-saffron-800">{message}</p>
      ) : null}
    </section>
  );
}
