"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlaceDateBar, type Place } from "@/components/FormBits";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import type { AjapaQuestion, AjapaVisibility } from "@/lib/ajapa/types";
import { defaultThursdayYmd } from "@/lib/dates";
import { searchLocal, upsertQuestions } from "@/lib/offline/idb";
import { displayPhone, phonesEqual } from "@/lib/offline/phone";
import {
  readLocalForDialogue,
  syncAjapaFromServer,
} from "@/lib/offline/sync";

const STATUS_LABEL: Record<AjapaQuestion["status"], string> = {
  ai_answered: "परमानंद साहित्य",
  escalated: "संवादकांकडे",
  guru_answered: "संवादक उत्तर",
};

const KIND_LABEL: Record<string, string> = {
  atmaprabha: "आत्मप्रभा",
  upadesh: "उपदेश",
};

const ROLE_LABEL = {
  charansevak: "चरणसेवक",
  guru: "संवादक",
  software: "संचालक",
  satsangi: "सत्संगी चरणसेवक",
} as const;

type MeetingTopic = {
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
  conductor: string | null;
  notes: string | null;
};

export default function AjapaPage() {
  const profile = useProfile();
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [date, setDate] = useState(defaultThursdayYmd());
  const [meeting, setMeeting] = useState<MeetingTopic | null>(null);

  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>(
    profile.role === "guru" ? "escalated" : "all",
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [visibility, setVisibility] = useState<AjapaVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const [otpForId, setOtpForId] = useState<number | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const [replyForId, setReplyForId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAudioUrl, setReplyAudioUrl] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canAsk =
    profile.role === "charansevak" ||
    profile.role === "satsangi" ||
    profile.role === "software";
  const canAnswer = profile.role === "guru" || profile.role === "software";

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === placeId) || null,
    [places, placeId],
  );

  const topicTitle = meeting?.topic_title?.trim() || "";
  const hasTopic = Boolean(topicTitle);
  const scope =
    placeId !== "" && date
      ? { place_id: placeId, meeting_date: date }
      : null;

  useEffect(() => {
    void api<{ places: Place[] }>("/api/places").then((data) => {
      setPlaces(data.places);
      setPlaceId((id) => {
        if (id !== "" && data.places.some((p) => p.id === id)) return id;
        const nashik = data.places.find((p) => p.name === "नाशिक");
        return nashik?.id ?? data.places[0]?.id ?? "";
      });
    });
  }, []);

  useEffect(() => {
    if (!placeId || !date) {
      setMeeting(null);
      return;
    }
    void api<{ meeting: MeetingTopic }>(
      `/api/meetings?place_id=${placeId}&date=${date}`,
    )
      .then((data) => setMeeting(data.meeting))
      .catch(() => setMeeting(null));
  }, [placeId, date]);

  const syncAndLoad = useCallback(async () => {
    if (!scope) return;
    setSyncing(true);
    setError(null);
    try {
      setItems(await readLocalForDialogue(profile, scope));
      const result = await syncAjapaFromServer(profile, scope);
      setItems(await readLocalForDialogue(profile, scope));
      setOffline(result.offline);
      setSyncNote(
        result.offline
          ? "ऑफलाइन · लोकल संवाद"
          : `सिंक · +${result.pulled} · या विषयावर ${result.localCount}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "लोड अयशस्वी");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [profile, scope?.place_id, scope?.meeting_date]);

  useEffect(() => {
    if (!scope) return;
    setLoading(true);
    void syncAndLoad();
  }, [syncAndLoad, scope?.place_id, scope?.meeting_date]);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    return searchLocal(list, query);
  }, [items, filter, query]);

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!scope) {
      setError("स्थळ व तारीख निवडा");
      return;
    }
    if (!hasTopic) {
      setError("प्रथम «विषय» मेनूमध्ये या स्थळाचा विषय जतन करा — मग संवाद सुरू होईल");
      return;
    }
    if (text.length < 3) {
      setError("प्रश्न थोडा मोठा लिहा");
      return;
    }
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await api<{ question: AjapaQuestion }>("/api/ajapa/questions", {
        method: "POST",
        body: JSON.stringify({
          question: text,
          seeker_name: profile.name || null,
          place_id: scope.place_id,
          meeting_date: scope.meeting_date,
          visibility,
        }),
      });
      await upsertQuestions([data.question]);
      setDraft("");
      setFilter("all");
      setQuery("");
      setOkMsg(
        visibility === "private"
          ? `खाजगी प्रश्न · परमानंद साहित्य उत्तर खाली (फक्त तुम्हाला)`
          : `सार्वजनिक प्रश्न · «${topicTitle}» वर सर्वांना दिसेल`,
      );
      setItems(await readLocalForDialogue(profile, scope));
      void syncAndLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "प्रश्न जतन अयशस्वी");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestOtp(q: AjapaQuestion) {
    setOtpBusy(true);
    setError(null);
    setOtpHint(null);
    setOkMsg(null);
    try {
      const data = await api<{
        message: string;
        debug_otp?: string;
      }>(`/api/ajapa/questions/${q.id}/request-otp`, { method: "POST" });
      setOtpForId(q.id);
      setOtpValue(data.debug_otp || "");
      setOtpHint(data.message);
      setOkMsg(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP अयशस्वी");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(q: AjapaQuestion) {
    if (!scope) return;
    setOtpBusy(true);
    setError(null);
    try {
      const data = await api<{ question: AjapaQuestion; message: string }>(
        `/api/ajapa/questions/${q.id}/verify-otp`,
        {
          method: "POST",
          body: JSON.stringify({ otp: otpValue }),
        },
      );
      await upsertQuestions([data.question]);
      setItems(await readLocalForDialogue(profile, scope));
      setOtpForId(null);
      setOtpValue("");
      setOtpHint(null);
      setFilter("escalated");
      setOkMsg(data.message);
      void syncAndLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP चुकीचा");
    } finally {
      setOtpBusy(false);
    }
  }

  function openReply(q: AjapaQuestion) {
    stopRecording();
    setReplyForId(q.id);
    setReplyText("");
    setReplyAudioUrl(null);
    setError(null);
  }

  function stopRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function startRecording(q: AjapaQuestion) {
    setError(null);
    setReplyForId(q.id);
    setReplyAudioUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          setReplyAudioUrl(typeof reader.result === "string" ? reader.result : null);
        };
        reader.readAsDataURL(blob);
        setRecording(false);
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
      };
      rec.start(250);
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 59) {
            stopRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("मायक्रोफोन परवानगी द्या — व्हॉइस रेकॉर्ड करता येईल");
    }
  }

  async function submitGuruAnswer(q: AjapaQuestion) {
    if (!scope) return;
    if (!replyText.trim() && !replyAudioUrl) {
      setError("मजकूर लिहा किंवा व्हॉइस रेकॉर्ड करा");
      return;
    }
    setReplyBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await api<{ question: AjapaQuestion; message: string }>(
        `/api/ajapa/questions/${q.id}/answer`,
        {
          method: "POST",
          body: JSON.stringify({
            text: replyText.trim() || undefined,
            audio_data_url: replyAudioUrl || undefined,
          }),
        },
      );
      await upsertQuestions([data.question]);
      setItems(await readLocalForDialogue(profile, scope));
      setReplyForId(null);
      setReplyText("");
      setReplyAudioUrl(null);
      setFilter("guru_answered");
      setOkMsg(data.message);
      void syncAndLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "उत्तर जतन अयशस्वी");
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">अजपा संवाद</h2>
          <p className="text-xs text-temple-muted">
            {ROLE_LABEL[profile.role]} · {displayPhone(profile.phone)}
            {offline ? " · ऑफलाइन" : ""}
          </p>
          <p className="text-[11px] text-temple-muted">
            विषय → संवाद · परमानंद साहित्य उत्तर नेहमी · private/public निवड ·
            मधुसुदनदास = Meta WhatsApp OTP
          </p>
          {syncNote ? <p className="text-[11px] text-temple-muted">{syncNote}</p> : null}
        </div>
        <button
          type="button"
          disabled={syncing || !scope}
          onClick={() => void syncAndLoad()}
          className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {syncing ? "सिंक…" : "सिंक"}
        </button>
      </div>

      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
      />

      {hasTopic ? (
        <div className="rounded-2xl bg-saffron-700 px-4 py-3 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-saffron-100">
            आजचा संवाद विषय
            {selectedPlace ? ` · ${selectedPlace.name}` : ""}
            {meeting?.topic_kind ? ` · ${KIND_LABEL[meeting.topic_kind]}` : ""}
          </p>
          <p className="mt-1 font-display text-2xl leading-tight">{topicTitle}</p>
          {meeting?.conductor ? (
            <p className="mt-1 text-xs text-saffron-100">संचालक: {meeting.conductor}</p>
          ) : null}
          {meeting?.notes ? (
            <p className="mt-2 text-sm text-saffron-50/95">{meeting.notes}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <p className="font-bold">विषय नसेल तर संवाद सुरू होत नाही</p>
          <p>
            {selectedPlace?.name || "स्थळ"} · {date} साठी विषय जतन करा — उदा. «मी कोण आहे».
            मग त्या विषयावर प्रश्न–उत्तर येथे चालेल व नाशिक/स्थळातील सर्वांना दिसेल.
          </p>
          <Link
            href="/topic"
            className="inline-block rounded-full bg-saffron-700 px-4 py-2 text-xs font-bold text-white"
          >
            विषय जतन करा →
          </Link>
        </div>
      )}

      {canAsk && hasTopic ? (
        <form
          onSubmit={(e) => void submitQuestion(e)}
          className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-saffron-200"
        >
          <p className="text-sm font-bold text-saffron-900">
            «{topicTitle}» वर तुमचा प्रश्न
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`rounded-xl py-2.5 text-xs font-bold ring-1 ${
                visibility === "private"
                  ? "bg-saffron-700 text-white ring-saffron-700"
                  : "bg-white text-temple-ink ring-saffron-200"
              }`}
            >
              खाजगी (private)
            </button>
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`rounded-xl py-2.5 text-xs font-bold ring-1 ${
                visibility === "public"
                  ? "bg-saffron-700 text-white ring-saffron-700"
                  : "bg-white text-temple-ink ring-saffron-200"
              }`}
            >
              सार्वजनिक (public)
            </button>
          </div>
          <p className="text-[11px] text-temple-muted">
            {visibility === "private"
              ? "फक्त तुम्हाला + संचालक/संवादक · परमानंद साहित्य उत्तर मिळेलच"
              : "स्थळातील सर्वांना दिसेल · परमानंद साहित्य उत्तर मिळेलच"}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={`उदा. «${topicTitle}» या विषयात माझा प्रश्न…`}
            className="w-full rounded-xl border border-saffron-200 bg-saffron-50 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || draft.trim().length < 3}
            className="w-full rounded-2xl bg-saffron-700 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting
              ? "परमानंद साहित्य उत्तर तयार…"
              : "प्रश्न पाठवा · परमानंद साहित्य उत्तर"}
          </button>
        </form>
      ) : null}

      {!canAsk && hasTopic ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-xs text-temple-muted">
          संवादक — «संवादकांकडे» फिल्टर पाहा · प्रत्येक प्रश्नावर{" "}
          <strong>उत्तर द्या · मजकूर / व्हॉइस नोट</strong>
        </p>
      ) : null}

      {hasTopic ? (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="या विषयातील शोध — प्रश्न / उत्तर"
            className="w-full rounded-xl border border-saffron-200 bg-white px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "सर्व"],
                ["ai_answered", "परमानंद साहित्य"],
                ["escalated", "संवादकांकडे"],
                ["guru_answered", "पूर्ण"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  filter === value
                    ? "bg-saffron-700 text-white ring-saffron-700"
                    : "bg-white ring-saffron-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {okMsg ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{okMsg}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading && hasTopic ? (
        <p className="text-sm text-temple-muted">संवाद लोड…</p>
      ) : null}

      <ul className="space-y-3">
        {visible.map((q) => (
          <li key={q.id} className="card space-y-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{q.question}</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200">
                  {STATUS_LABEL[q.status]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                    q.visibility === "public"
                      ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                      : "bg-stone-100 text-stone-700 ring-stone-200"
                  }`}
                >
                  {q.visibility === "public" ? "सार्वजनिक" : "खाजगी"}
                </span>
              </div>
            </div>
            {q.topic_title ? (
              <p className="text-[11px] font-semibold text-saffron-800">
                विषय: {q.topic_title}
                {q.place_name ? ` · ${q.place_name}` : ""}
              </p>
            ) : null}
            {q.seeker_name || profile.role === "software" || profile.role === "guru" ? (
              <p className="text-xs text-temple-muted">
                {q.seeker_name ? `${q.seeker_name}` : "सत्संगी"}
                {profile.role === "software" || profile.role === "guru"
                  ? ` · ${displayPhone(q.seeker_phone)}`
                  : ""}
              </p>
            ) : null}

            {q.ai_answer ? (
              <div className="rounded-xl bg-saffron-50/80 p-3 text-sm ring-1 ring-saffron-100">
                <p className="mb-1 font-bold text-saffron-900">परमानंद साहित्य उत्तर</p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-temple-ink/90">
                  {q.ai_answer}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                साहित्य उत्तर अजून नाही — सिंक करा
              </p>
            )}

            {q.status === "ai_answered" &&
            phonesEqual(profile.phone, q.seeker_phone) ? (
              <div className="space-y-2 border-t border-saffron-100 pt-2">
                {otpForId === q.id ? (
                  <>
                    <p className="text-xs text-temple-muted">
                      {otpHint ||
                        `Meta WhatsApp OTP · ${displayPhone(profile.phone)} वर तपासा`}
                    </p>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) =>
                        setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="६ अंकी OTP"
                      className="w-full rounded-xl border border-saffron-200 px-3 py-2 text-center text-lg font-bold tracking-widest"
                    />
                    <button
                      type="button"
                      disabled={otpBusy || otpValue.length !== 6}
                      onClick={() => void verifyOtp(q)}
                      className="w-full rounded-full bg-saffron-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {otpBusy ? "तपास…" : "OTP खात्री · मधुसुदनदास कडे"}
                    </button>
                    <button
                      type="button"
                      disabled={otpBusy}
                      onClick={() => void requestOtp(q)}
                      className="w-full text-xs font-semibold text-saffron-800 underline"
                    >
                      OTP पुन्हा पाठवा
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-temple-muted">
                      मधुसुदनदास उत्तर हवे असल्यास तुमच्या मोबाइलवर Meta WhatsApp
                      OTP येईल — खात्री झाल्यावर संवादकांकडे जाईल.
                    </p>
                    <button
                      type="button"
                      disabled={otpBusy}
                      onClick={() => void requestOtp(q)}
                      className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-saffron-900 ring-1 ring-saffron-300 disabled:opacity-50"
                    >
                      मधुसुदनदास उत्तर · Meta WhatsApp OTP
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {q.status === "escalated" && canAnswer ? (
              <div className="space-y-3 border-t border-saffron-100 pt-3">
                {replyForId === q.id ? (
                  <>
                    <p className="text-sm font-bold text-saffron-900">
                      संवादक उत्तर (मजकूर / व्हॉइस)
                    </p>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder="येथे उत्तर लिहा…"
                      className="w-full rounded-xl border border-saffron-200 bg-white px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      {!recording ? (
                        <button
                          type="button"
                          disabled={replyBusy}
                          onClick={() => void startRecording(q)}
                          className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-saffron-900 ring-1 ring-saffron-300 disabled:opacity-50"
                        >
                          {replyAudioUrl ? "पुन्हा रेकॉर्ड" : "व्हॉइस रेकॉर्ड"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stopRecording()}
                          className="rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
                        >
                          थांबवा · {recordSecs}से
                        </button>
                      )}
                      {replyAudioUrl ? (
                        <button
                          type="button"
                          disabled={replyBusy}
                          onClick={() => setReplyAudioUrl(null)}
                          className="text-xs font-semibold text-red-700 underline"
                        >
                          व्हॉइस काढा
                        </button>
                      ) : null}
                    </div>
                    {replyAudioUrl ? (
                      <audio controls src={replyAudioUrl} className="w-full" />
                    ) : null}
                    {recording ? (
                      <p className="text-xs font-semibold text-red-700">
                        रेकॉर्डिंग सुरू · कमाल ~१ मिनिट
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={
                        replyBusy ||
                        recording ||
                        (!replyText.trim() && !replyAudioUrl)
                      }
                      onClick={() => void submitGuruAnswer(q)}
                      className="w-full rounded-2xl bg-saffron-700 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {replyBusy ? "जतन…" : "उत्तर पाठवा"}
                    </button>
                    <button
                      type="button"
                      disabled={replyBusy || recording}
                      onClick={() => {
                        stopRecording();
                        setReplyForId(null);
                        setReplyText("");
                        setReplyAudioUrl(null);
                      }}
                      className="w-full text-xs font-semibold text-temple-muted underline"
                    >
                      रद्द
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openReply(q)}
                    className="w-full rounded-2xl bg-saffron-700 py-3 text-sm font-bold text-white"
                  >
                    उत्तर द्या · मजकूर / व्हॉइस नोट
                  </button>
                )}
              </div>
            ) : null}

            {q.status === "escalated" && !canAnswer ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
                संवादकांकडे · «{q.topic_title || topicTitle}» विषयावर उत्तर येईल
              </p>
            ) : null}

            {q.guru_answer_text ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm ring-1 ring-emerald-100">
                <p className="font-bold text-emerald-900">मधुसुदनदास / संवादक उत्तर</p>
                <p className="mt-1 whitespace-pre-wrap">{q.guru_answer_text}</p>
              </div>
            ) : null}
            {q.guru_answer_audio_url ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-900">व्हॉइस नोट</p>
                <audio controls src={q.guru_answer_audio_url} className="w-full" />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && hasTopic && visible.length === 0 ? (
        <div className="rounded-2xl bg-saffron-50 px-3 py-4 text-center text-sm text-temple-muted ring-1 ring-saffron-100">
          <p className="font-semibold text-temple-ink">
            «{topicTitle}» वर अजून संवाद नाही
          </p>
          <p className="mt-1">
            {canAsk
              ? "वर प्रश्न टाका — उत्तर या विषयावरच येईल व स्थळातील सर्वांना दिसेल."
              : canAnswer
                ? "फिल्टर «संवादकांकडे» निवडा — किंवा सिंक करा. उत्तर/व्हॉइस बटण तेथे दिसेल."
                : "प्रश्न येईल तेव्हा येथे दिसेल."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
