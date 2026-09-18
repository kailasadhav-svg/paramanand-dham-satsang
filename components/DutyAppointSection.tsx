"use client";

import type { Place } from "./FormBits";

export type DutyPerson = {
  charansevak_phone: string;
  charansevak_name: string | null;
  charansevak_phone_display: string;
} | null;

export type DutyDraft = { phone: string; name: string };

export function appointedLabel(duty: DutyPerson): string {
  if (!duty) return "नेमलेले नाही";
  return duty.charansevak_name || duty.charansevak_phone_display;
}

export function CompactDutyStrip({
  title,
  hint,
  places,
  selectedPlaceId,
  onSelectPlace,
  dutyByPlaceId,
  drafts,
  onDraftChange,
  onSave,
  busy,
  message,
  canAppoint,
}: {
  title: string;
  hint: string;
  places: Place[];
  selectedPlaceId: number | "";
  onSelectPlace: (id: number) => void;
  dutyByPlaceId: Record<number, DutyPerson>;
  drafts: Record<number, DutyDraft>;
  onDraftChange: (placeId: number, draft: DutyDraft) => void;
  onSave: (place: Place) => void;
  busy: boolean;
  message: string | null;
  canAppoint: boolean;
}) {
  const selected = places.find((p) => p.id === selectedPlaceId) || null;
  const draft = selected
    ? drafts[selected.id] || { phone: "", name: "" }
    : { phone: "", name: "" };

  return (
    <section className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-saffron-100">
      <h3 className="break-words text-xs font-bold text-saffron-900">{title}</h3>
      <p className="break-words text-[11px] text-temple-muted">{hint}</p>
      <ul className="space-y-0.5">
        {places.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelectPlace(p.id)}
              className={`block w-full rounded-lg px-1 py-0.5 text-left text-xs ${
                p.id === selectedPlaceId
                  ? "font-semibold text-saffron-900"
                  : "text-temple-muted"
              }`}
            >
              {p.name} — {appointedLabel(dutyByPlaceId[p.id] ?? null)}
            </button>
          </li>
        ))}
      </ul>
      {canAppoint && selected ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="नाव"
            value={draft.name}
            onChange={(e) =>
              onDraftChange(selected.id, { ...draft, name: e.target.value })
            }
            className="min-w-0 flex-1 rounded-xl bg-saffron-50 px-2 py-1.5 text-xs ring-1 ring-saffron-200"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="मोबाइल"
            value={draft.phone}
            onChange={(e) =>
              onDraftChange(selected.id, { ...draft, phone: e.target.value })
            }
            className="min-w-0 flex-1 rounded-xl bg-saffron-50 px-2 py-1.5 text-xs ring-1 ring-saffron-200"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(selected)}
            className="rounded-full bg-saffron-700 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "जतन"}
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="text-[11px] font-semibold text-saffron-800">{message}</p>
      ) : null}
    </section>
  );
}

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
  busy,
  message,
}: {
  title: string;
  help: string;
  places: Place[];
  selectedPlaceId: number | "";
  onSelectPlace: (id: number) => void;
  dutyByPlaceId: Record<number, DutyPerson>;
  drafts: Record<number, DutyDraft>;
  onDraftChange: (placeId: number, draft: DutyDraft) => void;
  onSave: (place: Place) => void;
  busy: boolean;
  message: string | null;
}) {
  const selected = places.find((p) => p.id === selectedPlaceId) || null;
  const draft = selected
    ? drafts[selected.id] || { phone: "", name: "" }
    : { phone: "", name: "" };
  const others = places.filter((p) => p.id !== selectedPlaceId);

  return (
    <section className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
      <h3 className="break-words text-sm font-bold text-saffron-900">{title}</h3>
      <p className="break-words text-[11px] text-temple-muted">{help}</p>
      <label className="block text-xs font-semibold text-temple-muted">
        नेमणूक स्थळ (ड्रॉपडाउन)
      </label>
      <select
        value={selectedPlaceId === "" ? "" : String(selectedPlaceId)}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (Number.isFinite(id)) onSelectPlace(id);
        }}
        className="w-full min-w-0 rounded-xl bg-saffron-50 px-3 py-2.5 text-sm font-semibold ring-1 ring-saffron-200"
        aria-label="नेमणूक स्थळ"
      >
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {appointedLabel(dutyByPlaceId[p.id] ?? null)}
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
            disabled={busy}
            onClick={() => onSave(selected)}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "जतन…" : "नेमणूक दुरुस्त / जतन"}
          </button>
        </div>
      ) : null}
      {others.length ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-temple-muted">
            इतर स्थळांच्या नेमणूका
          </p>
          {others.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlace(p.id)}
              className="block w-full rounded-lg px-1 py-0.5 text-left text-xs text-temple-muted"
            >
              {p.name} — {appointedLabel(dutyByPlaceId[p.id] ?? null)}
            </button>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="text-xs font-semibold text-saffron-800">{message}</p>
      ) : null}
    </section>
  );
}
