"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/components/PhoneGate";
import {
  VoiceNotePlayer,
  pickRecorderMime,
} from "@/components/VoiceNotePlayer";
import type { AjapaQuestion } from "@/lib/ajapa/types";
import { api } from "@/lib/api";
import { searchLocal, upsertQuestions } from "@/lib/offline/idb";
import { displayPhone, phonesEqual } from "@/lib/offline/phone";
import { readLocalForProfile, syncAjapaFromServer } from "@/lib/offline/sync";

const STATUS_LABEL: Record<AjapaQuestion["status"], string> = {
  ai_answered: "परमानंद साहित्य",
  escalated: "संवादकांकडे",
  guru_answered: "संवादक उत्तर",
};

const ROLE_LABEL = {
  charansevak: "चरणसेवक",
  guru: "संवादक",
  software: "सेवक",
} as const;

export default function AjapaPage() {
  const profile = useProfile();
  const [items, setItems] = useState<AjapaQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | AjapaQuestion["status"]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  const syncAndLoad = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      setItems(await readLocalForProfile(profile));
      const result = await syncAjapaFromServer(profile);
      setItems(await readLocalForProfile(profile));
      setOffline(result.offline);
      const extra =
        result.mirrored && result.mirrored > 0
          ? ` · नवीन उत्तर ${result.mirrored}`
          : "";
      setSyncNote(
        result.offline
          ? "ऑफलाइन · लोकल यादी"
          : `सिंक · +${result.pulled} · एकूण ${result.localCount}${extra}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "लोड अयशस्वी");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void syncAndLoad();
  }, [syncAndLoad]);

  useEffect(() => {
    if (canAnswer && filter === "all" && !loading) {
      const hasEscalated = items.some((q) => q.status === "escalated");
      if (hasEscalated) setFilter("escalated");
    }
    // Only once after first load for संवादक convenience
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canAnswer]);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((q) => q.status === filter);
    return searchLocal(list, query);
  }, [items, filter, query]);

  async function requestOtp(q: AjapaQuestion) {
    setOtpBusy(true);
    setError(null);
    setOkMsg(null);
    setOtpHint(null);
    try {
      const data = await api<{
        message?: string;
        debug_otp?: string;
        sent_to?: string;
      }>(`/api/ajapa/questions/${q.id}/request-otp`, { method: "POST" });
      setOtpForId(q.id);
      setOtpValue(data.debug_otp || "");
      setOtpHint(
        data.message ||
          `Meta WhatsApp OTP · ${data.sent_to || displayPhone(profile.phone)} वर तपासा`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP अयशस्वी");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(q: AjapaQuestion) {
    setOtpBusy(true);
    setError(null);
    try {
      const data = await api<{ message?: string }>(
        `/api/ajapa/questions/${q.id}/verify-otp`,
        {
          method: "POST",
          body: JSON.stringify({ otp: otpValue }),
        },
      );
      setOkMsg(data.message || "OTP खात्री · संवादकांकडे पाठवले");
      setOtpForId(null);
      setOtpValue("");
      setOtpHint(null);
      setFilter("escalated");
      await syncAndLoad();
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP चुकीचा");
    } finally {
      setOtpBusy(false);
    }
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

  function openReply(q: AjapaQuestion) {
    stopRecording();
    setReplyForId(q.id);
    setReplyText("");
    setReplyAudioUrl(null);
    setError(null);
  }

  async function startRecording(q: AjapaQuestion) {
    setError(null);
    setReplyForId(q.id);
    setReplyAudioUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      const mime = pickRecorderMime();
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const usedMime = rec.mimeType || mime || "audio/webm";
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: usedMime });
        if (blob.size < 64) {
          setError("रेकॉर्ड रिकामे — पुन्हा व्हॉइस रेकॉर्ड करा");
          setReplyAudioUrl(null);
          setRecording(false);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setReplyAudioUrl(
            typeof reader.result === "string" ? reader.result : null,
          );
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
          if (s >= 119) {
            stopRecording();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("मायक्रोफोन परवानगी द्या — व्हॉइस रेकॉर्ड करता येईल");
    }
  }

  async function submitGuruAnswer(q: AjapaQuestion) {
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
      setItems(await readLocalForProfile(profile));
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

  const viewHint =
    profile.role === "software"
      ? "सेवक — सर्व प्रश्न"
      : profile.role === "guru"
        ? "संवादक — उत्तर द्यावयाचे प्रश्न · मजकूर / व्हॉइस (२ मि)"
        : "तुमचे प्रश्न · साहित्य · Meta WhatsApp OTP → संवादक";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">अजपा संवाद</h2>
          <p className="text-xs text-temple-muted">
            {ROLE_LABEL[profile.role]} · {displayPhone(profile.phone)}
            {offline ? " · ऑफलाइन" : ""}
          </p>
          <p className="text-[11px] text-temple-muted">{viewHint}</p>
          {syncNote ? (
            <p className="text-[11px] text-temple-muted">{syncNote}</p>
          ) : null}
          {okMsg ? (
            <p className="text-[11px] font-semibold text-emerald-800">{okMsg}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncAndLoad()}
          className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {syncing ? "सिंक…" : "सिंक"}
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="लोकल शोध — प्रश्न / उत्तर / नाव"
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

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-temple-muted">लोड होत आहे…</p> : null}

      <ul className="space-y-3">
        {visible.map((q) => {
          const isOwner = phonesEqual(profile.phone, q.seeker_phone);
          return (
            <li key={q.id} className="card space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{q.question}</p>
                <span className="shrink-0 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800 ring-1 ring-saffron-200">
                  {STATUS_LABEL[q.status]}
                </span>
              </div>
              {profile.role !== "charansevak" ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-xs text-temple-muted">
                    {q.seeker_name ? `${q.seeker_name} · ` : ""}
                    {displayPhone(q.seeker_phone)}
                  </p>
                  <a
                    href={`tel:${displayPhone(q.seeker_phone)}`}
                    className="shrink-0 rounded-full bg-saffron-700 px-3 py-1 text-xs font-semibold text-white"
                  >
                    कॉल
                  </a>
                </div>
              ) : null}

              {q.status === "ai_answered" && isOwner ? (
                otpForId === q.id ? (
                  <div className="space-y-2 rounded-xl bg-saffron-50/80 p-3 ring-1 ring-saffron-200">
                    <p className="text-xs font-semibold text-saffron-900">
                      {otpHint ||
                        `Meta WhatsApp OTP · ${displayPhone(profile.phone)} वर तपासा`}
                    </p>
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) =>
                        setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="६ अंकी OTP"
                      className="w-full rounded-xl bg-white px-3 py-2 text-center text-lg tracking-widest ring-1 ring-saffron-300"
                    />
                    <button
                      type="button"
                      disabled={otpBusy || otpValue.length !== 6}
                      onClick={() => void verifyOtp(q)}
                      className="w-full rounded-xl bg-saffron-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {otpBusy ? "तपास…" : "OTP खात्री · संवादकांकडे पाठवा"}
                    </button>
                    <button
                      type="button"
                      disabled={otpBusy}
                      onClick={() => void requestOtp(q)}
                      className="w-full rounded-xl bg-white py-2 text-xs font-semibold text-saffron-800 ring-1 ring-saffron-300 disabled:opacity-50"
                    >
                      OTP पुन्हा पाठवा
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={otpBusy}
                    onClick={() => void requestOtp(q)}
                    className="w-full rounded-xl bg-saffron-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {otpBusy
                      ? "OTP पाठवत…"
                      : "मधुसुदनदास उत्तर · Meta WhatsApp OTP"}
                  </button>
                )
              ) : null}

              {q.status === "ai_answered" && !isOwner ? (
                <p className="text-xs text-temple-muted">
                  संवादकांकडे पाठवण्यासाठी प्रश्नकर्त्याने Meta WhatsApp OTP
                  खात्री करावी
                </p>
              ) : null}

              {q.status === "escalated" && !canAnswer ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  संवादकांकडे पाठवले — उत्तर येईल तेव्हा येथे दिसेल
                </p>
              ) : null}

              {q.status === "escalated" && canAnswer ? (
                <div className="space-y-3 border-t border-saffron-100 pt-3">
                  {replyForId === q.id ? (
                    <>
                      <p className="text-sm font-bold text-saffron-900">
                        संवादक उत्तर (मजकूर / व्हॉइस · कमाल २ मि)
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
                            थांबवा · {Math.floor(recordSecs / 60)}:
                            {String(recordSecs % 60).padStart(2, "0")}
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
                        <VoiceNotePlayer
                          src={replyAudioUrl}
                          label="रेकॉर्ड झालेली व्हॉइस (ऐका / पाठवा)"
                          filenameBase={`ajapa-draft-${q.id}`}
                        />
                      ) : null}
                      {recording ? (
                        <p className="text-xs font-semibold text-red-700">
                          रेकॉर्डिंग सुरू · कमाल २ मिनिटे
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

              {q.ai_answer ? (
                <details open={q.status === "ai_answered"} className="text-sm">
                  <summary className="cursor-pointer font-medium text-saffron-800">
                    परमानंद साहित्य उत्तर
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-temple-ink/90">
                    {q.ai_answer}
                  </p>
                </details>
              ) : null}
              {q.guru_answer_text ? (
                <div className="rounded-xl bg-saffron-50/60 p-2 text-sm">
                  <p className="font-semibold text-saffron-900">संवादक उत्तर</p>
                  <p className="whitespace-pre-wrap">{q.guru_answer_text}</p>
                </div>
              ) : null}
              {q.guru_answer_audio_url ? (
                <VoiceNotePlayer
                  src={q.guru_answer_audio_url}
                  label="व्हॉइस नोट · संवादक"
                  filenameBase={`ajapa-voice-${q.id}`}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">
          {query
            ? "शोध रिक्त"
            : canAnswer
              ? "«संवादकांकडे» फिल्टर तपासा — किंवा सिंक करा. उत्तर/व्हॉइस बटण तेथे दिसेल."
              : "अजपा संवाद मध्ये प्रश्न नाहीत — सिंक करा (किंवा प्रश्न टॅबवर नवीन प्रश्न विचारा)"}
        </p>
      ) : null}
    </div>
  );
}
