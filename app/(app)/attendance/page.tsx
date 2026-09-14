"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NumberStepper, PlaceDateBar, SaveBar, type Place } from "@/components/FormBits";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { DEFAULT_MEETING_TIME, defaultThursdayYmd } from "@/lib/dates";
import { ATTENDANCE_GEO_MAX_METERS, OFF_SITE_WARNING } from "@/lib/geo";
import { canSeeStaffScreens } from "@/lib/roles";

type Meeting = {
  place_id: number;
  meeting_date: string;
  meeting_time: string;
  men: number;
  women: number;
  children: number;
  checkin_ok?: boolean | null;
  checkin_distance_m?: number | null;
};

type DutyRow = {
  place: Place;
  duty: {
    charansevak_phone: string;
    charansevak_name: string | null;
    charansevak_phone_display: string;
  } | null;
};

type DutyDraft = { phone: string; name: string };
type GeoPos = { latitude: number; longitude: number; accuracy_m: number | null };

async function readGps(): Promise<GeoPos> {
  if (!navigator.geolocation) {
    throw new Error("या उपकरणावर GPS उपलब्ध नाही");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy ?? null,
        }),
      () => reject(new Error("स्थान परवानगी द्या (Location)")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export default function AttendancePage() {
  const profile = useProfile();
  const staff = canSeeStaffScreens(profile.role);

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

  const [dutyRows, setDutyRows] = useState<DutyRow[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, DutyDraft>>({});
  const [dutyMsg, setDutyMsg] = useState<string | null>(null);
  const [dutyBusy, setDutyBusy] = useState<number | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === placeId) || null,
    [places, placeId],
  );

  const loadDuties = useCallback(async (ymd: string) => {
    const data = await api<{ can_assign: boolean; rows: DutyRow[] }>(
      `/api/duties?date=${ymd}`,
    );
    setCanAssign(data.can_assign);
    setDutyRows(data.rows);
    const next: Record<number, DutyDraft> = {};
    for (const row of data.rows) {
      next[row.place.id] = {
        phone: row.duty?.charansevak_phone_display || "",
        name: row.duty?.charansevak_name || "",
      };
    }
    setDrafts(next);
    const visible = data.rows.map((r) => r.place);
    setPlaces(visible);
    setPlaceId((id) => {
      if (id !== "" && visible.some((p) => p.id === id)) return id;
      return visible[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    void loadDuties(date).catch((e) =>
      setError(e instanceof Error ? e.message : "नेमणूक लोड नाही"),
    );
  }, [date, loadDuties]);

  useEffect(() => {
    if (!placeId || !date) return;
    setSaved(false);
    void api<{ meeting: Meeting }>(`/api/meetings?place_id=${placeId}&date=${date}`)
      .then((data) => {
        setMen(data.meeting.men || 0);
        setWomen(data.meeting.women || 0);
        setChildren(data.meeting.children || 0);
        setTime(data.meeting.meeting_time || DEFAULT_MEETING_TIME);
        if (data.meeting.checkin_ok != null) {
          setLastCheckin(
            data.meeting.checkin_ok
              ? `✓ स्थळावर (${data.meeting.checkin_distance_m ?? "?"} मी)`
              : `✗ बाहेर (${data.meeting.checkin_distance_m ?? "?"} मी)`,
          );
        } else {
          setLastCheckin(null);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "अपलोड अयशस्वी"));
  }, [placeId, date]);

  async function pinPlaceHere() {
    if (!placeId || !staff) return;
    setPinBusy(true);
    setError(null);
    try {
      const geo = await readGps();
      await api("/api/places", {
        method: "PUT",
        body: JSON.stringify({
          place_id: placeId,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }),
      });
      await loadDuties(date);
      setDutyMsg("स्थळ GPS जतन — आता २० मी आत उपस्थिती चालेल");
    } catch (e) {
      setError(e instanceof Error ? e.message : "GPS जतन अयशस्वी");
    } finally {
      setPinBusy(false);
    }
  }

  async function saveAttendance() {
    if (!placeId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let geo: GeoPos | null = null;
      if (!staff) {
        geo = await readGps();
      } else {
        try {
          geo = await readGps();
        } catch {
          geo = null;
        }
      }

      await api("/api/meetings", {
        method: "PUT",
        body: JSON.stringify({
          place_id: placeId,
          meeting_date: date,
          meeting_time: time,
          men,
          women,
          children,
          ...(geo
            ? {
                latitude: geo.latitude,
                longitude: geo.longitude,
                accuracy_m: geo.accuracy_m,
              }
            : {}),
        }),
      });
      setSaved(true);
      setLastCheckin(geo ? `✓ नोंद (≤${ATTENDANCE_GEO_MAX_METERS} मी)` : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : OFF_SITE_WARNING);
    } finally {
      setSaving(false);
    }
  }

  async function saveDuty(place: Place) {
    const draft = drafts[place.id] || { phone: "", name: "" };
    setDutyBusy(place.id);
    setDutyMsg(null);
    try {
      if (!draft.phone.replace(/\D/g, "")) {
        await api("/api/duties", {
          method: "PUT",
          body: JSON.stringify({
            place_id: place.id,
            meeting_date: date,
            clear: true,
          }),
        });
      } else {
        await api("/api/duties", {
          method: "PUT",
          body: JSON.stringify({
            place_id: place.id,
            meeting_date: date,
            charansevak_phone: draft.phone,
            charansevak_name: draft.name || null,
          }),
        });
      }
      await loadDuties(date);
      setDutyMsg("नेमणूक जतन");
    } catch (e) {
      setDutyMsg(e instanceof Error ? e.message : "नेमणूक अयशस्वी");
    } finally {
      setDutyBusy(null);
    }
  }

  const assignedLabel = useMemo(() => {
    const row = dutyRows.find((r) => r.place.id === placeId);
    if (!row?.duty) return null;
    return row.duty.charansevak_name || row.duty.charansevak_phone_display;
  }, [dutyRows, placeId]);

  const total = men + women + children;
  const placeHasGps =
    selectedPlace?.latitude != null && selectedPlace?.longitude != null;

  if (!staff && places.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">उपस्थिती</h2>
        <p className="rounded-2xl bg-saffron-50 p-4 text-sm text-temple-muted">
          या गुरुवारी तुमच्या नावावर ठिकाण नेमलेले नाही. गुरु (
          <strong>9850120960</strong>) किंवा सॉफ्टवेअर (
          <strong>9225118811</strong>) नेमणूक ठरतील — मग तुमचे काम येथे दिसेल.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">उपस्थिती</h2>
        <p className="text-xs text-temple-muted">
          {staff
            ? "नेमणूक + स्थळ GPS · चरणसेवक ≤२० मी आत नोंद करतील"
            : `तुमची नेमणूक · सत्संग स्थळापासून ${ATTENDANCE_GEO_MAX_METERS} मी आत`}
        </p>
      </div>

      {canAssign ? (
        <section className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <h3 className="text-sm font-bold text-saffron-900">
            गुरुवारी चरणसेवक नेमणूक
          </h3>
          <p className="text-[11px] text-temple-muted">
            9850120960 व 9225118811 ठरवतील · 9136443333 / 9423078811 स्वतः चरणसेवक
          </p>
          {dutyRows.map((row) => {
            const draft = drafts[row.place.id] || { phone: "", name: "" };
            return (
              <div
                key={row.place.id}
                className="space-y-2 rounded-xl bg-saffron-50/50 p-3"
              >
                <p className="text-sm font-semibold">{row.place.name}</p>
                <input
                  type="text"
                  placeholder="नाव"
                  value={draft.name}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [row.place.id]: { ...draft, name: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-saffron-200"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="मोबाइल"
                  value={draft.phone}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [row.place.id]: { ...draft, phone: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-saffron-200"
                />
                <button
                  type="button"
                  disabled={dutyBusy === row.place.id}
                  onClick={() => void saveDuty(row.place)}
                  className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {dutyBusy === row.place.id ? "जतन…" : "नेमणूक जतन"}
                </button>
              </div>
            );
          })}
          {dutyMsg ? (
            <p className="text-xs font-semibold text-saffron-800">{dutyMsg}</p>
          ) : null}
        </section>
      ) : null}

      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
      />

      {assignedLabel ? (
        <p className="text-xs text-temple-muted">चरणसेवक: {assignedLabel}</p>
      ) : null}

      {staff && placeId ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <p className="text-xs text-temple-muted">
            स्थळ GPS:{" "}
            {placeHasGps
              ? `${selectedPlace?.latitude?.toFixed(5)}, ${selectedPlace?.longitude?.toFixed(5)}`
              : "अजून सेट नाही"}
          </p>
          <button
            type="button"
            disabled={pinBusy}
            onClick={() => void pinPlaceHere()}
            className="mt-2 rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pinBusy ? "GPS…" : "इथेच स्थळ चिन्हांकित करा"}
          </button>
        </div>
      ) : null}

      {!staff ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          उपस्थिती जतन करताना GPS चालू ठेवा. स्थळापासून {ATTENDANCE_GEO_MAX_METERS}{" "}
          मी बाहेर असल्यास नोंद बंद — «{OFF_SITE_WARNING}»
        </p>
      ) : null}

      {lastCheckin ? (
        <p className="text-xs font-semibold text-saffron-800">{lastCheckin}</p>
      ) : null}

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
      <SaveBar
        saving={saving}
        saved={saved}
        error={error}
        onSave={() => void saveAttendance()}
      />
    </div>
  );
}
