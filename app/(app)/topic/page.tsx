"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaceDateBar, SaveBar, type Place } from "@/components/FormBits";
import { ThursdayTithiBar } from "@/components/ThursdayTithiBar";
import { api } from "@/lib/api";
import { defaultThursdayYmd } from "@/lib/dates";
import {
  CHINTAN_LABEL,
  CHINTAN_WRITE_PLACEHOLDER,
  GUIDE_TOPIC_HELP,
  PLACE_TOPIC_LOCKED_HELP,
  PLACE_TOPIC_LOCK_SCOPE_HELP,
  PLACE_TOPIC_PRIOR_SUMMARY_HELP,
  TOPIC_EDIT_GUIDE_ONLY_HELP,
  TOPIC_THURSDAY_HELP,
  VAHAK_APPOINT_HELP,
  VAHAK_JOB_HELP,
  VAHAK_LABEL,
  VAHAK_NO_TOPIC_EDIT_HELP,
} from "@/lib/labels";

type Meeting = {
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
  conductor: string | null;
  notes: string | null;
};

export default function TopicPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [placeLocked, setPlaceLocked] = useState(false);
  const [isVahak, setIsVahak] = useState(false);
  const [canEditTopic, setCanEditTopic] = useState(false);
  const [topicLocked, setTopicLocked] = useState(false);
  const [needsPriorSummary, setNeedsPriorSummary] = useState(false);
  const [date, setDate] = useState(defaultThursdayYmd());
  const [kind, setKind] = useState<"atmaprabha" | "upadesh">("atmaprabha");
  const [title, setTitle] = useState("");
  const [conductor, setConductor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{
      places: Place[];
      default_place_id?: number | null;
      place_locked?: boolean;
      is_vahak?: boolean;
      can_edit_topic?: boolean;
    }>(`/api/places?date=${date}`).then((data) => {
      setPlaces(data.places);
      setPlaceLocked(Boolean(data.place_locked));
      setIsVahak(Boolean(data.is_vahak));
      setCanEditTopic(Boolean(data.can_edit_topic));
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
  }, [date]);

  useEffect(() => {
    if (!placeId || !date) return;
    setSaved(false);
    setTopicLocked(false);
    setNeedsPriorSummary(false);
    void api<{
      meeting: Meeting;
      topic_locked?: boolean;
      chintan_count?: number;
      topic_needs_prior_summary?: boolean;
    }>(`/api/meetings?place_id=${placeId}&date=${date}`).then((data) => {
      setKind(data.meeting.topic_kind || "atmaprabha");
      setTitle(data.meeting.topic_title || "");
      setConductor(data.meeting.conductor || "");
      setNotes(data.meeting.notes || "");
      setTopicLocked(Boolean(data.topic_locked));
      setNeedsPriorSummary(Boolean(data.topic_needs_prior_summary));
    });
  }, [placeId, date]);

  const topicEditable = canEditTopic && !topicLocked && !needsPriorSummary;

  async function save() {
    if (!placeId || !topicEditable) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/meetings", {
        method: "PUT",
        body: JSON.stringify({
          place_id: placeId,
          meeting_date: date,
          topic_kind: kind,
          topic_title: title,
          conductor,
          notes,
        }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ThursdayTithiBar ymd={date} />
      <h2 className="text-lg font-bold">विषय व {VAHAK_LABEL}</h2>
      <p className="text-xs leading-relaxed text-temple-muted">{TOPIC_THURSDAY_HELP}</p>
      <p className="text-xs leading-relaxed text-temple-muted">{GUIDE_TOPIC_HELP}</p>
      <p className="text-xs leading-relaxed text-temple-muted">{PLACE_TOPIC_LOCK_SCOPE_HELP}</p>
      <p className="text-xs font-semibold leading-relaxed text-temple-muted">
        {VAHAK_NO_TOPIC_EDIT_HELP}
      </p>
      <p className="text-xs leading-relaxed text-temple-muted">{VAHAK_JOB_HELP}</p>
      {places.length === 0 ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-sm text-temple-muted">
          या गुरुवारी विचार वाहक नेमलेले नाही. {VAHAK_APPOINT_HELP}
        </p>
      ) : null}
      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
        locked={placeLocked}
      />
      {topicLocked ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
          {PLACE_TOPIC_LOCKED_HELP}
        </p>
      ) : needsPriorSummary ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
          {PLACE_TOPIC_PRIOR_SUMMARY_HELP}{" "}
          <Link href="/weekly" className="font-semibold underline">
            चिंतन · सारांश
          </Link>
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setKind("atmaprabha")}
          disabled={!topicEditable}
          className={`rounded-2xl py-3 font-semibold ring-1 ${
            kind === "atmaprabha"
              ? "bg-saffron-700 text-white ring-saffron-700"
              : "bg-white ring-saffron-200"
          } disabled:opacity-60`}
        >
          आत्मप्रभा
        </button>
        <button
          type="button"
          onClick={() => setKind("upadesh")}
          disabled={!topicEditable}
          className={`rounded-2xl py-3 font-semibold ring-1 ${
            kind === "upadesh"
              ? "bg-saffron-700 text-white ring-saffron-700"
              : "bg-white ring-saffron-200"
          } disabled:opacity-60`}
        >
          उपदेश
        </button>
      </div>
      <label className="block text-xs font-semibold text-temple-muted">
        विषय शीर्षक
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200"
          placeholder="उदा. भगवद्गीता / सत्संग कथा"
          disabled={!topicEditable}
          readOnly={!topicEditable}
        />
      </label>
      <label className="block text-xs font-semibold text-temple-muted">
        {VAHAK_LABEL}
        <input
          value={conductor}
          onChange={(e) => setConductor(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200"
          placeholder="नाव"
          disabled={isVahak || !topicEditable}
        />
      </label>
      <label className="block text-xs font-semibold text-temple-muted">
        {CHINTAN_LABEL}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={CHINTAN_WRITE_PLACEHOLDER}
          aria-label={CHINTAN_LABEL}
          disabled={!topicEditable}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200"
        />
      </label>
      {canEditTopic && topicEditable ? (
        <SaveBar saving={saving} saved={saved} error={error} onSave={() => void save()} />
      ) : !canEditTopic ? (
        <p className="text-sm text-temple-muted">
          {TOPIC_EDIT_GUIDE_ONLY_HELP} {VAHAK_LABEL} फक्त चिंतन पाठपुरावा व आले / बाकी पाहतात.
        </p>
      ) : null}
    </div>
  );
}
