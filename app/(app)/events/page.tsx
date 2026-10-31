"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMarathiDate, ymdInIndia } from "@/lib/dates";
import { splitEventsByDate } from "@/lib/events";
import { EVENTS_LABEL } from "@/lib/labels";

type EventRow = {
  id: number;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
};

const EMPTY_FORM = {
  title: "",
  event_date: "",
  event_time: "",
  location: "",
  description: "",
};

const inputClass =
  "mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-normal text-temple-ink ring-1 ring-saffron-200";

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ events: EventRow[]; can_manage: boolean }>("/api/events");
    setEvents(data.events);
    setCanManage(data.can_manage);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/events", { method: "POST", body: JSON.stringify(form) });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSaving(false);
    }
  }

  async function remove(event: EventRow) {
    if (!window.confirm(`«${event.title}» काढायचा?`)) return;
    setError(null);
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "काढता आले नाही");
    }
  }

  const { upcoming, past } = splitEventsByDate(events, ymdInIndia());

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">सत्संग {EVENTS_LABEL}</h2>
          <p className="text-xs text-temple-muted">आगामी व झालेले कार्यक्रम</p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="shrink-0 rounded-full border border-saffron-200 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800"
          >
            {showForm ? "रद्द" : "+ नवीन"}
          </button>
        ) : null}
      </div>

      {canManage && showForm ? (
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block text-xs font-semibold text-temple-muted">
            कार्यक्रमाचे नाव
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="उदा. गुरुपौर्णिमा सत्संग"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-temple-muted">
              तारीख
              <input
                required
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-temple-muted">
              वेळ
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-xs font-semibold text-temple-muted">
            स्थळ
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass}
              placeholder="उदा. श्री क्षेत्र रानअंत्री"
            />
          </label>
          <label className="block text-xs font-semibold text-temple-muted">
            थोडक्यात माहिती
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              placeholder="कार्यक्रमाविषयी…"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-saffron-700 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "जतन होत आहे…" : "कार्यक्रम जतन करा"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <EventSection
        title="आगामी कार्यक्रम"
        events={upcoming}
        empty={loaded ? "आगामी कार्यक्रम नाही" : "लोड होत आहे…"}
        canManage={canManage}
        onRemove={remove}
        highlight
      />
      <EventSection
        title="झालेले कार्यक्रम"
        events={past}
        empty={loaded ? "अद्याप नोंद नाही" : "लोड होत आहे…"}
        canManage={canManage}
        onRemove={remove}
      />
    </div>
  );
}

function EventSection({
  title,
  events,
  empty,
  canManage,
  onRemove,
  highlight = false,
}: {
  title: string;
  events: EventRow[];
  empty: string;
  canManage: boolean;
  onRemove: (event: EventRow) => void;
  highlight?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-saffron-800">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-sm text-temple-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className={`card space-y-1 p-4 ${highlight ? "" : "opacity-90"}`}>
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 break-words font-bold leading-snug">{e.title}</h4>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => onRemove(e)}
                    className="shrink-0 text-xs font-semibold text-red-700"
                  >
                    काढा
                  </button>
                ) : null}
              </div>
              <p
                className={`text-sm font-semibold ${highlight ? "text-saffron-800" : "text-temple-muted"}`}
              >
                {formatMarathiDate(e.event_date)}
                {e.event_time ? ` · ${e.event_time}` : ""}
              </p>
              {e.location ? (
                <p className="text-sm text-temple-muted">स्थळ: {e.location}</p>
              ) : null}
              {e.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
