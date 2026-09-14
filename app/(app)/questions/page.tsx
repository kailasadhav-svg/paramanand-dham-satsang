"use client";

import { useEffect, useMemo, useState } from "react";
import { PlaceDateBar, type Place } from "@/components/FormBits";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { ANSWERED_BY_LABEL } from "@/lib/labels";
import { defaultThursdayYmd, weekFromThursday } from "@/lib/dates";
import { canSeeStaffScreens } from "@/lib/roles";

type Question = {
  id: number;
  place_id: number | null;
  place_name: string | null;
  question: string;
  answer: string | null;
  answered_by: "atmaprabha" | "madhusudandas" | null;
};

export default function QuestionsPage() {
  const profile = useProfile();
  const staff = canSeeStaffScreens(profile.role);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [placeLocked, setPlaceLocked] = useState(false);
  const [date, setDate] = useState(defaultThursdayYmd());
  const [items, setItems] = useState<Question[]>([]);
  const [draft, setDraft] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const week = useMemo(() => weekFromThursday(date), [date]);

  useEffect(() => {
    void api<{
      places: Place[];
      default_place_id?: number | null;
      place_locked?: boolean;
    }>("/api/places").then((data) => {
      setPlaces(data.places);
      setPlaceLocked(Boolean(data.place_locked));
      setPlaceId((id) => {
        if (id !== "" && data.places.some((p) => p.id === id)) return id;
        if (
          data.default_place_id != null &&
          data.places.some((p) => p.id === data.default_place_id)
        ) {
          return data.default_place_id;
        }
        return data.places[0]?.id ?? "";
      });
    });
  }, []);

  async function load() {
    const q = new URLSearchParams({ from: week.start, to: week.end });
    if (placeId) q.set("place_id", String(placeId));
    if (onlyOpen) q.set("unanswered", "1");
    const data = await api<{ questions: Question[] }>(
      `/api/questions?${q.toString()}`,
    );
    setItems(data.questions);
  }

  useEffect(() => {
    if (!placeId) return;
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "लोड अयशस्वी"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId, date, onlyOpen]);

  async function addQuestion() {
    if (!draft.trim() || !placeId) return;
    setSavingId("new");
    setError(null);
    setOkMsg(null);
    try {
      const res = await api<{
        ajapa_id?: number | null;
        ajapa_error?: string | null;
      }>("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          question: draft,
          place_id: placeId,
          asked_on: date,
        }),
      });
      setDraft("");
      if (res.ajapa_id) {
        setOkMsg(
          "प्रश्न जतन · संवाद मध्ये साहित्य उत्तर तयार. «संवाद» टॅब → सिंक दाबा. अधिक स्पष्टतेसाठी तेथे मधुसुदनदास विजयानंद यांच्याकडे पाठवता येईल.",
        );
      } else {
        setOkMsg(
          "प्रश्न जतन झाला. संवाद उत्तर नंतर सिंक वर तयार होईल." +
            (res.ajapa_error ? ` (${res.ajapa_error})` : ""),
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSavingId(null);
    }
  }

  async function saveAnswer(q: Question) {
    if (!staff) return;
    setSavingId(q.id);
    setError(null);
    try {
      await api(`/api/questions/${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          answer: q.answer,
          answered_by: q.answered_by,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSavingId(null);
    }
  }

  async function remove(id: number) {
    if (!staff) return;
    if (!confirm("हा प्रश्न काढायचा?")) return;
    await api(`/api/questions/${id}`, { method: "DELETE" });
    await load();
  }

  async function sendToSanwad(id: number) {
    setSavingId(id);
    setError(null);
    setOkMsg(null);
    try {
      const res = await api<{ ajapa_id?: number | null }>(
        `/api/questions/${id}/to-ajapa`,
        { method: "POST" },
      );
      setOkMsg(
        res.ajapa_id
          ? "संवाद मध्ये उत्तर तयार — «संवाद» टॅब → सिंक दाबा"
          : "संवाद तयार होत आहे — सिंक पुन्हा दाबा",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "संवाद अयशस्वी");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">प्रश्नोत्तर</h2>
        <p className="break-words text-xs text-temple-muted">
          {staff
            ? "संचालक / संवादक — प्रश्न व उत्तर"
            : "सत्संगी — प्रश्न विचारा; उत्तर «संवाद» मध्ये दिसेल (सिंक)"}
        </p>
      </div>
      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
        locked={placeLocked}
      />
      {staff ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          फक्त प्रलंबित प्रश्न
        </label>
      ) : null}
      <div className="card space-y-2 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="नवा प्रश्न लिहा…"
          className="w-full min-w-0 rounded-xl bg-saffron-50/50 px-3 py-2 ring-1 ring-saffron-200"
        />
        <button
          type="button"
          disabled={savingId === "new" || !placeId}
          onClick={() => void addQuestion()}
          className="w-full rounded-xl bg-saffron-700 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {savingId === "new" ? "जतन…" : "प्रश्न जोडा"}
        </button>
        {okMsg ? (
          <p className="break-words text-xs font-semibold text-emerald-800">
            {okMsg}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="break-words text-sm text-red-700">{error}</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id} className="card space-y-2 p-3">
            <p className="break-words font-semibold">{q.question}</p>
            <p className="text-xs text-temple-muted">{q.place_name}</p>
            {staff ? (
              <>
                <textarea
                  value={q.answer || ""}
                  onChange={(e) =>
                    setItems((list) =>
                      list.map((it) =>
                        it.id === q.id ? { ...it, answer: e.target.value } : it,
                      ),
                    )
                  }
                  rows={3}
                  placeholder="उत्तर"
                  className="w-full min-w-0 rounded-xl px-3 py-2 ring-1 ring-saffron-200"
                />
                <div className="flex flex-wrap gap-2">
                  {(["atmaprabha", "madhusudandas"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() =>
                        setItems((list) =>
                          list.map((it) =>
                            it.id === q.id ? { ...it, answered_by: src } : it,
                          ),
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        q.answered_by === src
                          ? "bg-saffron-700 text-white ring-saffron-700"
                          : "bg-white ring-saffron-200"
                      }`}
                    >
                      {ANSWERED_BY_LABEL[src]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingId === q.id}
                    onClick={() => void saveAnswer(q)}
                    className="flex-1 rounded-xl bg-saffron-700 py-2 text-sm font-semibold text-white"
                  >
                    उत्तर जतन
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(q.id)}
                    className="rounded-xl bg-white px-3 py-2 text-sm text-red-800 ring-1 ring-red-200"
                  >
                    काढा
                  </button>
                </div>
              </>
            ) : q.answer ? (
              <div className="rounded-xl bg-saffron-50/70 p-2 text-sm">
                <p className="text-xs font-semibold text-saffron-900">
                  उत्तर
                  {q.answered_by
                    ? ` · ${ANSWERED_BY_LABEL[q.answered_by]}`
                    : ""}
                </p>
                <p className="mt-1 break-words whitespace-pre-wrap">
                  {q.answer}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-temple-muted">उत्तर प्रलंबित…</p>
                <button
                  type="button"
                  disabled={savingId === q.id}
                  onClick={() => void sendToSanwad(q.id)}
                  className="w-full rounded-xl bg-saffron-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingId === q.id
                    ? "तयार करत आहे…"
                    : "संवादात साहित्य उत्तर घ्या"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">
          या आठवड्यात प्रश्न नाहीत — वर लिहून «प्रश्न जोडा»
        </p>
      ) : null}
    </div>
  );
}
