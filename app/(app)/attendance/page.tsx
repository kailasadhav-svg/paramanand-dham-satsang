"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NumberStepper, PlaceDateBar, SaveBar, type Place } from "@/components/FormBits";
import { ThursdayTithiBar } from "@/components/ThursdayTithiBar";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { DEFAULT_MEETING_TIME, defaultThursdayYmd } from "@/lib/dates";
import {
  ATTENDANCE_GEO_MAX_METERS,
  OFF_SITE_WARNING,
  ON_SITE_BLESSING,
} from "@/lib/geo";
import { canApproveCharansevak, canSeeGuideScreens, canSeeStaffScreens } from "@/lib/roles";
import { DUTY_KIND_SATSANG, DUTY_KIND_VAHAK, type PlaceDutyKind } from "@/lib/duty-kind";
import { displayPhone } from "@/lib/offline/phone";
import {
  GUIDE_MAIN_WORK_HELP,
  SATSANG_CHARANSEVAK_APPOINT_HELP,
  SATSANG_CHARANSEVAK_JOB_HELP,
  SATSANG_CHARANSEVAK_LABEL,
  VAHAK_APPOINT_HELP,
  VAHAK_LABEL,
} from "@/lib/labels";
import { DutyAppointSection, type DutyDraft } from "@/components/DutyAppointSection";
import Link from "next/link";

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

type DutyPerson = {
  charansevak_phone: string;
  charansevak_name: string | null;
  charansevak_phone_display: string;
} | null;

type DutyRow = {
  place: Place;
  duty: DutyPerson;
  satsang_duty: DutyPerson;
};

type Member = {
  id: number;
  name: string;
  phone: string;
  phone_display: string;
  home_place_id: number | null;
};

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
  const guide = canSeeGuideScreens(profile.role);
  const canApprove = canApproveCharansevak(profile.role);

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
  const [canAssignSatsang, setCanAssignSatsang] = useState(false);
  const [dutyPlaceId, setDutyPlaceId] = useState<number | "">("");
  const [satsangPlaceId, setSatsangPlaceId] = useState<number | "">("");
  const [drafts, setDrafts] = useState<Record<number, DutyDraft>>({});
  const [satsangDrafts, setSatsangDrafts] = useState<Record<number, DutyDraft>>({});
  const [dutyMsg, setDutyMsg] = useState<string | null>(null);
  const [satsangMsg, setSatsangMsg] = useState<string | null>(null);
  const [dutyBusy, setDutyBusy] = useState<number | null>(null);
  const [satsangBusy, setSatsangBusy] = useState<number | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [onSite, setOnSite] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveMsg, setApproveMsg] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | "">("");

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === placeId) || null,
    [places, placeId],
  );

  const placeMembers = useMemo(
    () =>
      members.filter((m) => placeId !== "" && m.home_place_id === placeId),
    [members, placeId],
  );

  const selectedMember = useMemo(
    () => placeMembers.find((m) => m.id === selectedMemberId) || null,
    [placeMembers, selectedMemberId],
  );

  const loadDuties = useCallback(async (ymd: string) => {
    const data = await api<{
      can_assign: boolean;
      can_assign_satsang: boolean;
      rows: DutyRow[];
    }>(`/api/duties?date=${ymd}`);
    setCanAssign(data.can_assign);
    setCanAssignSatsang(data.can_assign_satsang);
    setDutyRows(data.rows);
    const next: Record<number, DutyDraft> = {};
    const nextSatsang: Record<number, DutyDraft> = {};
    for (const row of data.rows) {
      next[row.place.id] = {
        phone: row.duty?.charansevak_phone_display || "",
        name: row.duty?.charansevak_name || "",
      };
      nextSatsang[row.place.id] = {
        phone: row.satsang_duty?.charansevak_phone_display || "",
        name: row.satsang_duty?.charansevak_name || "",
      };
    }
    setDrafts(next);
    setSatsangDrafts(nextSatsang);
    const visible = data.rows.map((r) => r.place);
    setPlaces(visible);
    setPlaceId((id) => {
      if (id !== "" && visible.some((p) => p.id === id)) return id;
      return visible[0]?.id ?? "";
    });
    setDutyPlaceId((id) => {
      if (id !== "" && data.rows.some((r) => r.place.id === id)) return id;
      return data.rows[0]?.place.id ?? "";
    });
    setSatsangPlaceId((id) => {
      if (id !== "" && data.rows.some((r) => r.place.id === id)) return id;
      return data.rows[0]?.place.id ?? "";
    });
  }, []);

  const loadMembers = useCallback(async () => {
    if (!canApprove) return;
    const data = await api<{ members: Member[] }>("/api/satsangi-members");
    setMembers(data.members);
  }, [canApprove]);

  useEffect(() => {
    void loadDuties(date).catch((e) =>
      setError(e instanceof Error ? e.message : "नेमणूक लोड नाही"),
    );
    void loadMembers().catch(() => undefined);
  }, [date, loadDuties, loadMembers]);

  useEffect(() => {
    if (!placeId || !date) return;
    setSaved(false);
    setSelectedMemberId("");
    void api<{ meeting: Meeting }>(`/api/meetings?place_id=${placeId}&date=${date}`)
      .then((data) => {
        setMen(data.meeting.men || 0);
        setWomen(data.meeting.women || 0);
        setChildren(data.meeting.children || 0);
        setTime(data.meeting.meeting_time || DEFAULT_MEETING_TIME);
        if (data.meeting.checkin_ok != null) {
          const ok = Boolean(data.meeting.checkin_ok);
          setOnSite(ok);
          setLastCheckin(
            ok
              ? `✓ स्थळावर (${data.meeting.checkin_distance_m ?? "?"} मी)`
              : `✗ बाहेर (${data.meeting.checkin_distance_m ?? "?"} मी)`,
          );
          if (ok && !staff) setSaved(true);
        } else {
          setOnSite(false);
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

  async function approveMember() {
    if (!placeId) {
      setError("आधी स्थळ निवडा — परमानंद चरणसेवक त्याच स्थळाचा राहील");
      return;
    }
    setApproveBusy(true);
    setApproveMsg(null);
    setError(null);
    try {
      const data = await api<{
        member: Member & { home_place_name?: string };
      }>("/api/satsangi-members", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          home_place_id: placeId,
        }),
      });
      setNewName("");
      setNewPhone("");
      await loadMembers();
      setSelectedMemberId(data.member.id);
      setApproveMsg(
        `परमानंद चरणसेवक मंजूर: ${data.member.name} · ${data.member.phone_display} · ${
          data.member.home_place_name || selectedPlace?.name || ""
        }`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "मंजुरी अयशस्वी");
    } finally {
      setApproveBusy(false);
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
      setOnSite(true);
      setLastCheckin(
        geo
          ? `✓ नोंद (≤${ATTENDANCE_GEO_MAX_METERS} मी)`
          : "✓ नोंद जतन",
      );
    } catch (e) {
      setOnSite(false);
      setError(e instanceof Error ? e.message : OFF_SITE_WARNING);
    } finally {
      setSaving(false);
    }
  }

  async function saveDuty(place: Place, kind: PlaceDutyKind) {
    const isSatsang = kind === DUTY_KIND_SATSANG;
    const draft = (isSatsang ? satsangDrafts : drafts)[place.id] || {
      phone: "",
      name: "",
    };
    const setBusy = isSatsang ? setSatsangBusy : setDutyBusy;
    const setMsg = isSatsang ? setSatsangMsg : setDutyMsg;
    setBusy(place.id);
    setMsg(null);
    try {
      if (!draft.phone.replace(/\D/g, "")) {
        await api("/api/duties", {
          method: "PUT",
          body: JSON.stringify({
            place_id: place.id,
            meeting_date: date,
            duty_kind: kind,
            clear: true,
          }),
        });
      } else {
        await api("/api/duties", {
          method: "PUT",
          body: JSON.stringify({
            place_id: place.id,
            meeting_date: date,
            duty_kind: kind,
            charansevak_phone: draft.phone,
            charansevak_name: draft.name || null,
          }),
        });
      }
      await loadDuties(date);
      setMsg("नेमणूक जतन");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "नेमणूक अयशस्वी");
    } finally {
      setBusy(null);
    }
  }

  const assignedLabel = useMemo(() => {
    const row = dutyRows.find((r) => r.place.id === placeId);
    if (!row?.duty) return null;
    return row.duty.charansevak_name || row.duty.charansevak_phone_display;
  }, [dutyRows, placeId]);

  const assignedSatsangLabel = useMemo(() => {
    const row = dutyRows.find((r) => r.place.id === placeId);
    if (!row?.satsang_duty) return null;
    return (
      row.satsang_duty.charansevak_name ||
      row.satsang_duty.charansevak_phone_display
    );
  }, [dutyRows, placeId]);

  const dutyPlaces = useMemo(() => dutyRows.map((r) => r.place), [dutyRows]);
  const vahakByPlace = useMemo(() => {
    const next: Record<number, DutyPerson> = {};
    for (const row of dutyRows) next[row.place.id] = row.duty;
    return next;
  }, [dutyRows]);
  const satsangByPlace = useMemo(() => {
    const next: Record<number, DutyPerson> = {};
    for (const row of dutyRows) next[row.place.id] = row.satsang_duty;
    return next;
  }, [dutyRows]);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      setter(v);
    };
  }

  const total = men + women + children;
  const placeHasGps =
    selectedPlace?.latitude != null && selectedPlace?.longitude != null;

  const attendanceEditors = (
    <>
      {staff && placeId ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <p className="text-xs font-semibold text-saffron-900">स्थळ GPS (एडिट)</p>
          <p className="mt-1 text-xs text-temple-muted">
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
            {pinBusy
              ? "GPS…"
              : placeHasGps
                ? "GPS पुन्हा सेट / दुरुस्त करा"
                : "इथेच स्थळ चिन्हांकित करा"}
          </button>
          {placeHasGps ? (
            <p className="mt-1 text-[11px] text-temple-muted">
              चुकीच्या जागी सेट झाले असेल तर स्थळावर उभे राहून पुन्हा दाबा
            </p>
          ) : null}
        </div>
      ) : null}

      {!staff ? (
        onSite ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold leading-relaxed text-emerald-900">
            {ON_SITE_BLESSING}
          </p>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            उपस्थिती जतन करताना GPS चालू ठेवा. स्थळापासून {ATTENDANCE_GEO_MAX_METERS}{" "}
            मी बाहेर असल्यास नोंद बंद — «{OFF_SITE_WARNING}»
          </p>
        )
      ) : null}

      {lastCheckin ? (
        <p className="text-xs font-semibold text-saffron-800">{lastCheckin}</p>
      ) : null}

      <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
        <p className="text-xs font-semibold text-saffron-900">वेळ · एडिट</p>
        <input
          type="time"
          value={time}
          onChange={(e) => markDirty(setTime)(e.target.value)}
          className="w-full rounded-xl bg-saffron-50 px-3 py-3 text-lg font-bold ring-1 ring-saffron-200"
        />
        <div className="flex flex-wrap gap-2">
          {["19:30", "20:00", "20:30", "21:00"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => markDirty(setTime)(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                time === t
                  ? "bg-saffron-700 text-white"
                  : "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-saffron-200">
        <div>
          <p className="text-xs font-semibold text-temple-muted">
            {staff ? "एकूण उपस्थिती" : "एकूण परमानंद चरणसेवक"}
          </p>
          <p className="text-[11px] text-temple-muted">+/− किंवा आकडा टाइप · एडिट</p>
        </div>
        <p className="text-3xl font-bold tabular-nums text-saffron-800">{total}</p>
      </div>
      <div className="space-y-2">
        <NumberStepper compact label="पुरुष" value={men} onChange={markDirty(setMen)} />
        <NumberStepper compact label="स्त्रिया" value={women} onChange={markDirty(setWomen)} />
        <NumberStepper compact label="बालके" value={children} onChange={markDirty(setChildren)} />
      </div>
      <SaveBar
        sticky={!guide}
        saving={saving}
        saved={saved}
        error={error}
        label={saved ? "दुरुस्ती पुन्हा जतन करा" : "जतन / दुरुस्ती करा"}
        savedLabel={
          staff
            ? "जतन झाले ✓ · चुकल्यास वर आकडा/वेळ बदला व पुन्हा जतन"
            : onSite
              ? "जतन झाले ✓ · चुकल्यास वर आकडा/वेळ बदला व पुन्हा जतन"
              : ON_SITE_BLESSING
        }
        onSave={() => void saveAttendance()}
      />
    </>
  );

  if (!staff && places.length === 0) {
    return (
      <div className="space-y-3">
        <ThursdayTithiBar ymd={date} />
        <h2 className="text-lg font-bold">उपस्थिती</h2>
        <p className="rounded-2xl bg-saffron-50 p-4 text-sm text-temple-muted">
          या गुरुवारी तुमच्या नावावर सत्संग चरणसेवक नेमणूक नाही. {SATSANG_CHARANSEVAK_APPOINT_HELP}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <ThursdayTithiBar ymd={date} />
      <div>
        <h2 className="text-lg font-bold">
          {guide
            ? `उपस्थिती · ${SATSANG_CHARANSEVAK_LABEL} नेमणूक`
            : staff
              ? `उपस्थिती · ${SATSANG_CHARANSEVAK_LABEL} · एडिट`
              : `उपस्थिती · ${SATSANG_CHARANSEVAK_LABEL}`}
        </h2>
        <p className="text-xs text-temple-muted">
          {guide
            ? `${SATSANG_CHARANSEVAK_LABEL} नेमा — उपस्थिती आकडे त्यांचे काम.`
            : staff
              ? `${SATSANG_CHARANSEVAK_LABEL} काम: स्थळी उपस्थिती नोंदवा. चुकले तर संख्या / वेळ / GPS पुन्हा बदलून «दुरुस्ती जतन» दाबा`
              : "या स्थळी किती परमानंद चरणसेवक आले ते नोंदवा. चुकले तर संख्या / वेळ पुन्हा बदलून जतन करा."}
        </p>
      </div>

      {guide ? (
        <section className="space-y-2 rounded-2xl bg-saffron-50 p-3 ring-1 ring-saffron-200">
          <p className="text-sm font-semibold text-saffron-900">
            उपस्थिती {SATSANG_CHARANSEVAK_LABEL} यांचे काम
          </p>
          <p className="text-[11px] leading-relaxed text-temple-muted">
            {GUIDE_MAIN_WORK_HELP}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/weekly"
              className="rounded-full bg-saffron-700 px-3 py-1.5 text-white"
            >
              चिंतन
            </Link>
            <Link
              href="/questions"
              className="rounded-full bg-white px-3 py-1.5 text-saffron-900 ring-1 ring-saffron-200"
            >
              प्रश्नोत्तर
            </Link>
          </div>
        </section>
      ) : null}

      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={markDirty(setPlaceId)}
        onDate={markDirty(setDate)}
      />

      {canAssignSatsang ? (
        <DutyAppointSection
          primary
          title={`गुरुवारी ${SATSANG_CHARANSEVAK_LABEL} नेमणूक (एडिट)`}
          help={`${SATSANG_CHARANSEVAK_APPOINT_HELP} ${SATSANG_CHARANSEVAK_JOB_HELP} प्रत्येक स्थळी आठवड्यात एकच सत्संग चरणसेवक. स्थळ ड्रॉपडाउनमधून निवडा — फक्त त्या स्थळाचा नाव + मोबाइल फॉर्म दिसतो.`}
          places={dutyPlaces}
          selectedPlaceId={satsangPlaceId}
          onSelectPlace={(id) => {
            setSatsangPlaceId(id);
            setSatsangMsg(null);
          }}
          dutyByPlaceId={satsangByPlace}
          drafts={satsangDrafts}
          onDraftChange={(placeId, draft) =>
            setSatsangDrafts((d) => ({ ...d, [placeId]: draft }))
          }
          onSave={(place) => void saveDuty(place, DUTY_KIND_SATSANG)}
          busyPlaceId={satsangBusy}
          message={satsangMsg}
          ariaLabel="सत्संग चरणसेवक नेमणूक स्थळ निवडा"
        />
      ) : null}

      {canAssign ? (
        <DutyAppointSection
          title={`गुरुवारी ${VAHAK_LABEL} नेमणूक (एडिट)`}
          help={`${VAHAK_APPOINT_HELP} प्रत्येक स्थळी आठवड्यात एकच विचार वाहक. स्थळ ड्रॉपडाउनमधून निवडा — फक्त त्या स्थळाचा नाव + मोबाइल फॉर्म दिसतो.`}
          places={dutyPlaces}
          selectedPlaceId={dutyPlaceId}
          onSelectPlace={(id) => {
            setDutyPlaceId(id);
            setDutyMsg(null);
          }}
          dutyByPlaceId={vahakByPlace}
          drafts={drafts}
          onDraftChange={(placeId, draft) =>
            setDrafts((d) => ({ ...d, [placeId]: draft }))
          }
          onSave={(place) => void saveDuty(place, DUTY_KIND_VAHAK)}
          busyPlaceId={dutyBusy}
          message={dutyMsg}
          ariaLabel="नेमणूक स्थळ निवडा"
        />
      ) : null}

      {!canApprove && !staff ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-[11px] leading-relaxed text-temple-muted">
          तुमचे काम: उपस्थित परमानंद चरणसेवक संख्या नोंदवा. नवीन सदस्य मंजुरी फक्त मार्गदर्शक (मधुसुदनदास) करतात.
        </p>
      ) : null}

      {canApprove ? (
        <section className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <h3 className="break-words text-sm font-bold text-saffron-900">
            नवीन परमानंद चरणसेवक मंजूर करा
          </h3>
          <p className="break-words text-[11px] text-temple-muted">
            फक्त मार्गदर्शक (मधुसुदनदास) · नाव + मोबाइल · स्थळ{" "}
            <strong>{selectedPlace?.name || "—"}</strong>
          </p>
          <input
            type="text"
            placeholder="नाव — उदा. मधुकर आढाव"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="मोबाइल — उदा. 9021555060"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <button
            type="button"
            disabled={approveBusy || !placeId || !newName.trim() || !newPhone.trim()}
            onClick={() => void approveMember()}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {approveBusy ? "मंजूर करत आहे…" : "मंजूर करा"}
          </button>
          {approveMsg ? (
            <p className="break-words text-xs font-semibold text-emerald-800">
              {approveMsg}
            </p>
          ) : null}

          <div className="space-y-2 border-t border-saffron-100 pt-3">
            <label className="block text-xs font-semibold text-temple-muted">
              या स्थळाचे परमानंद चरणसेवक (ड्रॉपडाउन)
            </label>
            <select
              value={selectedMemberId === "" ? "" : String(selectedMemberId)}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedMemberId(Number.isFinite(id) ? id : "");
              }}
              className="w-full min-w-0 rounded-xl bg-saffron-50 px-3 py-2.5 text-sm font-semibold ring-1 ring-saffron-200"
              aria-label="परमानंद चरणसेवक निवडा"
            >
              <option value="">
                {placeMembers.length
                  ? `निवडा… (${placeMembers.length})`
                  : "या स्थळावर अजून परमानंद चरणसेवक नाही"}
              </option>
              {placeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.phone_display}
                </option>
              ))}
            </select>
            {selectedMember ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-saffron-50/70 px-3 py-2 ring-1 ring-saffron-100">
                <div className="min-w-0">
                  <p className="break-words font-bold text-saffron-900">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-temple-muted">
                    {selectedMember.phone_display}
                  </p>
                </div>
                <a
                  href={`tel:${displayPhone(selectedMember.phone)}`}
                  className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-saffron-900 ring-1 ring-saffron-200"
                >
                  कॉल
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {assignedSatsangLabel ? (
        <p className="text-xs text-temple-muted">
          {SATSANG_CHARANSEVAK_LABEL}: {assignedSatsangLabel}
        </p>
      ) : null}
      {assignedLabel ? (
        <p className="text-xs text-temple-muted">विचार वाहक: {assignedLabel}</p>
      ) : null}

      {guide ? (
        <details className="rounded-2xl bg-white p-3 ring-1 ring-saffron-100">
          <summary className="cursor-pointer text-sm font-semibold text-temple-muted">
            उपस्थिती आकडे · सत्संग चरणसेवक मुख्य
          </summary>
          <div className="mt-3 space-y-4">
            {attendanceEditors}
          </div>
        </details>
      ) : (
        attendanceEditors
      )}
    </div>
  );
}
