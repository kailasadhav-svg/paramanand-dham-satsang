"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceDateBar, type Place } from "@/components/FormBits";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { ThursdayTithiBar } from "@/components/ThursdayTithiBar";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { resizeForThumb, resizeForUpload } from "@/lib/image-resize";
import {
  ANSWERED_BY_LABEL,
  GUIDE_QUESTION_HELP,
  HANDWRITTEN_LABEL,
  HANDWRITTEN_PHOTO_HELP,
  LITERATURE_ANSWER_LABEL,
  ONE_QUESTION_HELP,
  QUESTION_AI_FIRST_HELP,
  QUESTION_ID_HELP,
} from "@/lib/labels";
import { defaultThursdayYmd, weekFromThursday } from "@/lib/dates";
import { canSeeGuideScreens } from "@/lib/roles";

type Question = {
  id: number;
  place_id: number | null;
  place_name: string | null;
  question: string;
  answer: string | null;
  answered_by: "atmaprabha" | "madhusudandas" | null;
  handwritten_url: string | null;
  handwritten_thumb_url: string | null;
  handwritten_at: string | null;
  public_id?: string;
};

/** Same URL after a replace would show the cached image — version it by upload time. */
function versioned(url: string, version: string | null): string {
  if (!version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

export default function QuestionsPage() {
  const profile = useProfile();
  const guide = canSeeGuideScreens(profile.role);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [placeLocked, setPlaceLocked] = useState(false);
  const [date, setDate] = useState(defaultThursdayYmd());
  const [items, setItems] = useState<Question[]>([]);
  const [askedThisWeek, setAskedThisWeek] = useState(false);
  const [draft, setDraft] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [openHandwritten, setOpenHandwritten] = useState<Question | null>(null);

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
    const data = await api<{ questions: Question[]; asked_this_week?: boolean }>(
      `/api/questions?${q.toString()}`,
    );
    setItems(data.questions);
    setAskedThisWeek(Boolean(data.asked_this_week));
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
          `प्रश्न जतन · संवाद मध्ये ${LITERATURE_ANSWER_LABEL} तयार. «संवाद» टॅब → सिंक दाबा. अधिक स्पष्टतेसाठी तेथे मधुसुदनदास विजयानंद यांच्याकडे पाठवता येईल.`,
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
    if (!guide) return;
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
    if (!guide) return;
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

  async function uploadHandwritten(q: Question, file: File) {
    if (!guide) return;
    setSavingId(q.id);
    setError(null);
    setOkMsg(null);
    try {
      const [full, thumb] = await Promise.all([resizeForUpload(file), resizeForThumb(file)]);
      const fd = new FormData();
      fd.append("image", full.blob, "handwritten.jpg");
      fd.append("thumb", thumb.blob, "thumb.jpg");
      const res = await fetch(`/api/questions/${q.id}/handwritten`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `त्रुटी ${res.status}`);
      setOkMsg(`${HANDWRITTEN_LABEL} जतन झाले — प्रश्नकर्त्याला उत्तरात दिसेल.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "हस्तलिखित अयशस्वी");
    } finally {
      setSavingId(null);
    }
  }

  async function removeHandwritten(q: Question) {
    if (!guide) return;
    if (!confirm(`${HANDWRITTEN_LABEL} काढायचे?`)) return;
    setSavingId(q.id);
    setError(null);
    try {
      await api(`/api/questions/${q.id}/handwritten`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "हस्तलिखित काढता आले नाही");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <ThursdayTithiBar ymd={date} />
      <div>
        <h2 className="text-lg font-bold">प्रश्नोत्तर</h2>
        <p className="break-words text-xs text-temple-muted">
          {guide
            ? `${GUIDE_QUESTION_HELP} ${QUESTION_ID_HELP} ${HANDWRITTEN_PHOTO_HELP}`
            : `${ONE_QUESTION_HELP} ${QUESTION_AI_FIRST_HELP} ${QUESTION_ID_HELP}`}
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
      {guide ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          फक्त प्रलंबित प्रश्न
        </label>
      ) : null}
      {!guide && askedThisWeek ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-xs leading-relaxed text-saffron-900">
          {ONE_QUESTION_HELP} उत्तर «संवाद» मध्ये दिसेल.
        </p>
      ) : (
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
      )}
      {error ? (
        <p className="break-words text-sm text-red-700">{error}</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id} className="card space-y-2 p-3">
            <p className="break-words font-semibold">{q.question}</p>
            <p className="text-xs text-temple-muted">
              {q.public_id ? `${q.public_id} · ` : ""}
              {q.place_name}
            </p>
            {guide ? (
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
                <HandwrittenControl
                  question={q}
                  busy={savingId === q.id}
                  onUpload={(file) => void uploadHandwritten(q, file)}
                  onRemove={() => void removeHandwritten(q)}
                  onOpen={() => setOpenHandwritten(q)}
                />
              </>
            ) : q.answer || q.handwritten_url ? (
              <div className="rounded-xl bg-saffron-50/70 p-2 text-sm">
                <p className="text-xs font-semibold text-saffron-900">
                  उत्तर
                  {q.answered_by
                    ? ` · ${ANSWERED_BY_LABEL[q.answered_by]}`
                    : ""}
                </p>
                {q.answer ? (
                  <p className="mt-1 break-words whitespace-pre-wrap">
                    {q.answer}
                  </p>
                ) : null}
                {q.handwritten_thumb_url ? (
                  <>
                    <p className="mt-2 text-xs font-semibold text-saffron-900">
                      {HANDWRITTEN_LABEL}
                      {q.answered_by === "madhusudandas"
                        ? ""
                        : ` · ${ANSWERED_BY_LABEL.madhusudandas}`}
                    </p>
                    <HandwrittenThumb question={q} onOpen={() => setOpenHandwritten(q)} />
                  </>
                ) : null}
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
                    : `संवादात ${LITERATURE_ANSWER_LABEL} घ्या`}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">
          {!guide && askedThisWeek
            ? `${ONE_QUESTION_HELP} उत्तर «संवाद» मध्ये दिसेल.`
            : "या आठवड्यात प्रश्न नाहीत — वर लिहून «प्रश्न जोडा»"}
        </p>
      ) : null}
      {openHandwritten?.handwritten_url ? (
        <PhotoLightbox
          photos={[
            {
              id: openHandwritten.id,
              image_url: versioned(openHandwritten.handwritten_url, openHandwritten.handwritten_at),
              thumb_url: versioned(
                openHandwritten.handwritten_thumb_url ?? openHandwritten.handwritten_url,
                openHandwritten.handwritten_at,
              ),
              caption: `${HANDWRITTEN_LABEL} · ${openHandwritten.question}`,
              taken_on: null,
              event_title: null,
            },
          ]}
          index={0}
          onClose={() => setOpenHandwritten(null)}
          onIndex={() => undefined}
        />
      ) : null}
    </div>
  );
}

function HandwrittenThumb({
  question,
  onOpen,
}: {
  question: Question;
  onOpen: () => void;
}) {
  if (!question.handwritten_thumb_url) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${HANDWRITTEN_LABEL} मोठे पाहा`}
      className="mt-2 block overflow-hidden rounded-xl bg-white ring-1 ring-saffron-200"
    >
      <img
        src={versioned(question.handwritten_thumb_url, question.handwritten_at)}
        alt={HANDWRITTEN_LABEL}
        className="h-28 w-28 object-cover"
      />
    </button>
  );
}

function HandwrittenControl({
  question,
  busy,
  onUpload,
  onRemove,
  onOpen,
}: {
  question: Question;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const has = Boolean(question.handwritten_thumb_url);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-saffron-50/70 p-2">
      {has ? <HandwrittenThumb question={question} onOpen={onOpen} /> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold text-saffron-900">{HANDWRITTEN_LABEL}</p>
        <div className="flex flex-wrap gap-2">
          <label
            className={`cursor-pointer rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-saffron-900 ring-1 ring-saffron-200 ${
              busy ? "opacity-50" : ""
            }`}
          >
            {busy ? "अपलोड…" : has ? "फोटो बदला" : "फोटो अपलोड"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </label>
          {has ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              aria-label={`${HANDWRITTEN_LABEL} काढा`}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 disabled:opacity-50"
            >
              काढा
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
