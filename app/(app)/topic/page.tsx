"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaceDateBar, SaveBar, type Place } from "@/components/FormBits";
import { WeeklyTopics } from "@/components/WeeklyTopics";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { defaultThursdayYmd } from "@/lib/dates";
import { canSeeStaffScreens } from "@/lib/roles";

type Meeting = {
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
  conductor: string | null;
  notes: string | null;
};

export default function TopicPage() {
  const profile = useProfile();
  const canEdit = canSeeStaffScreens(profile.role);

  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [date, setDate] = useState(defaultThursdayYmd());
  const [kind, setKind] = useState<"atmaprabha" | "upadesh">("atmaprabha");
  const [title, setTitle] = useState("");
  const [conductor, setConductor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!placeId || !date) return;
    setSaved(false);
    void api<{ meeting: Meeting }>(`/api/meetings?place_id=${placeId}&date=${date}`).then(
      (data) => {
        setKind(data.meeting.topic_kind || "atmaprabha");
        setTitle(data.meeting.topic_title || "");
        setConductor(data.meeting.conductor || "");
        setNotes(data.meeting.notes || "");
      },
    );
  }, [placeId, date]);

  async function save() {
    if (!placeId || !canEdit) return;
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
      <h2 className="text-lg font-bold">विषय व संचालक</h2>
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-950 ring-1 ring-emerald-100">
        जतन केलेला विषय = <strong>अजपा संवाद</strong> चा आधार. नाशिक/इतर स्थळातील
        सर्वांना तो विषय व त्यावरील प्रश्न–उत्तर दिसतात.
        {canEdit
          ? " संचालक / संवादक जतन करू शकतात."
          : " तुम्ही फक्त पाहू शकता — जतन संचालक / संवादक करतील."}
      </p>

      <WeeklyTopics date={date} highlightPlaceId={placeId} />

      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setKind("atmaprabha")}
          className={`rounded-2xl py-3 font-semibold ring-1 disabled:opacity-70 ${
            kind === "atmaprabha"
              ? "bg-saffron-700 text-white ring-saffron-700"
              : "bg-white ring-saffron-200"
          }`}
        >
          आत्मप्रभा
        </button>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setKind("upadesh")}
          className={`rounded-2xl py-3 font-semibold ring-1 disabled:opacity-70 ${
            kind === "upadesh"
              ? "bg-saffron-700 text-white ring-saffron-700"
              : "bg-white ring-saffron-200"
          }`}
        >
          उपदेश
        </button>
      </div>
      <label className="block text-xs font-semibold text-temple-muted">
        विषय शीर्षक
        <input
          value={title}
          readOnly={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200 read-only:bg-saffron-50"
          placeholder="उदा. भगवद्गीता / सत्संग कथा"
        />
      </label>
      <label className="block text-xs font-semibold text-temple-muted">
        संचालक
        <input
          value={conductor}
          readOnly={!canEdit}
          onChange={(e) => setConductor(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200 read-only:bg-saffron-50"
          placeholder="नाव"
        />
      </label>
      <label className="block text-xs font-semibold text-temple-muted">
        टिपणी
        <textarea
          value={notes}
          readOnly={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 ring-1 ring-saffron-200 read-only:bg-saffron-50"
        />
      </label>
      {canEdit ? (
        <SaveBar saving={saving} saved={saved} error={error} onSave={() => void save()} />
      ) : (
        <p className="text-center text-xs text-temple-muted">
          फक्त वाचन · जतन नाही
        </p>
      )}
      {saved ? (
        <p className="text-center text-xs text-emerald-800">
          विषय जतन · आता{" "}
          <Link href="/ajapa" className="font-semibold underline">
            अजपा
          </Link>{" "}
          मध्ये या विषयावर संवाद सुरू होईल (स्थळातील सर्वांना)
        </p>
      ) : null}
    </div>
  );
}
