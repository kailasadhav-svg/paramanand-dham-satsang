"use client";

import { useEffect, useState } from "react";
import { NumberStepper, PlaceDateBar, SaveBar, type Place } from "@/components/FormBits";
import { api } from "@/lib/api";
import { DEFAULT_MEETING_TIME, defaultThursdayYmd } from "@/lib/dates";

type Meeting = {
  place_id: number;
  meeting_date: string;
  meeting_time: string;
  men: number;
  women: number;
  children: number;
};

export default function AttendancePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [date, setDate] = useState(defaultThursdayYmd());
  const [men, setMen] = useState(0);
  const [women, setWomen] = useState(0);
  const [children, setChildren] = useState(0);
  const [time, setTime] = useState(DEFAULT_MEETING_TIME);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ places: Place[] }>("/api/places").then((data) => {
      setPlaces(data.places);
      setPlaceId((id) => (id === "" && data.places[0] ? data.places[0].id : id));
    });
  }, []);

  useEffect(() => {
    if (!placeId || !date) return;
    setSaved(false);
    void api<{ meeting: Meeting }>(`/api/meetings?place_id=${placeId}&date=${date}`).then(
      (data) => {
        setMen(data.meeting.men || 0);
        setWomen(data.meeting.women || 0);
        setChildren(data.meeting.children || 0);
        setTime(data.meeting.meeting_time || DEFAULT_MEETING_TIME);
      },
    );
  }, [placeId, date]);

  async function save() {
    if (!placeId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/meetings", {
        method: "PUT",
        body: JSON.stringify({
          place_id: placeId,
          meeting_date: date,
          meeting_time: time,
          men,
          women,
          children,
        }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
    } finally {
      setSaving(false);
    }
  }

  const total = men + women + children;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">उपस्थिती</h2>
      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
      />
      <label className="block text-xs font-semibold text-temple-muted">
        वेळ
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white px-3 py-2 ring-1 ring-saffron-200"
        />
      </label>
      <div className="card px-4 py-4 text-center">
        <p className="text-sm text-temple-muted">एकूण उपस्थिती</p>
        <p className="text-4xl font-bold text-saffron-800">{total}</p>
      </div>
      <NumberStepper label="पुरुष" value={men} onChange={setMen} />
      <NumberStepper label="स्त्रिया" value={women} onChange={setWomen} />
      <NumberStepper label="बालके" value={children} onChange={setChildren} />
      <SaveBar saving={saving} saved={saved} error={error} onSave={() => void save()} />
    </div>
  );
}
