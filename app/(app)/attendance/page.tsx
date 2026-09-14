"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlaceDateBar, type Place } from "@/components/FormBits";
import { WeeklyTopics } from "@/components/WeeklyTopics";
import { useProfile } from "@/components/PhoneGate";
import { api } from "@/lib/api";
import { defaultThursdayYmd } from "@/lib/dates";
import {
  canAppointSatsangi,
  canAssignConductor,
  canSeeStaffScreens,
  roleLabelMarathi,
} from "@/lib/roles";
import { phonesEqual } from "@/lib/offline/phone";

type DutyRow = {
  place: Place;
  duty: {
    charansevak_phone: string;
    charansevak_name: string | null;
    charansevak_phone_display: string;
    rotate_hint?: string | null;
  } | null;
};

type Member = {
  id: number;
  phone: string;
  name: string;
  phone_display: string;
};

type Person = {
  phone: string;
  name: string | null;
  phone_display: string;
  source: string;
  opinion: string | null;
  checked_in_at: string;
};

export default function AttendancePage() {
  const profile = useProfile();
  const canAppoint = canAppointSatsangi(profile.role);
  const canAssign = canAssignConductor(profile.role);
  const fullStaff = canSeeStaffScreens(profile.role);

  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | "">("");
  const [placeLocked, setPlaceLocked] = useState(false);
  const [date, setDate] = useState(defaultThursdayYmd());
  const [dutyRows, setDutyRows] = useState<DutyRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [appointBusy, setAppointBusy] = useState(false);

  const [dutyPhone, setDutyPhone] = useState("");
  const [dutyName, setDutyName] = useState("");
  const [dutyBusy, setDutyBusy] = useState(false);
  const [rotateHint, setRotateHint] = useState<string | null>(null);

  const [checkinBusy, setCheckinBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === placeId) || null,
    [places, placeId],
  );

  const myCheckedIn = useMemo(
    () => people.some((p) => phonesEqual(p.phone, profile.phone)),
    [people, profile.phone],
  );

  const loadDuties = useCallback(async (ymd: string) => {
    const data = await api<{
      can_assign: boolean;
      can_appoint: boolean;
      place_locked?: boolean;
      default_place_id?: number | null;
      rows: DutyRow[];
    }>(`/api/duties?date=${ymd}`);
    setDutyRows(data.rows);
    const visible = data.rows.map((r) => r.place);
    setPlaces(visible);
    setPlaceLocked(Boolean(data.place_locked));
    setPlaceId((id) => {
      if (
        data.default_place_id != null &&
        visible.some((p) => p.id === data.default_place_id)
      ) {
        return data.default_place_id;
      }
      if (id !== "" && visible.some((p) => p.id === id)) return id;
      return visible[0]?.id ?? "";
    });
  }, []);

  const loadMembers = useCallback(async () => {
    if (!canAppoint) return;
    const data = await api<{ members: Member[] }>("/api/members");
    setMembers(data.members);
  }, [canAppoint]);

  const loadPeople = useCallback(async (pid: number, ymd: string) => {
    const data = await api<{ total: number; people: Person[] }>(
      `/api/attendance/checkin?place_id=${pid}&date=${ymd}`,
    );
    setPeople(data.people);
    setTotal(data.total);
  }, []);

  useEffect(() => {
    void loadDuties(date).catch((e) =>
      setError(e instanceof Error ? e.message : "नेमणूक लोड नाही"),
    );
    void loadMembers().catch(() => undefined);
  }, [date, loadDuties, loadMembers]);

  useEffect(() => {
    if (!placeId || !date) return;
    const row = dutyRows.find((r) => r.place.id === placeId);
    setDutyPhone(row?.duty?.charansevak_phone_display || "");
    setDutyName(row?.duty?.charansevak_name || "");
    setRotateHint(row?.duty?.rotate_hint || null);
    void loadPeople(placeId, date).catch((e) =>
      setError(e instanceof Error ? e.message : "उपस्थिती लोड नाही"),
    );
  }, [placeId, date, dutyRows, loadPeople]);

  async function appointMember() {
    if (!placeId) {
      setError("आधी स्थळ निवडा — सत्संगी त्याच स्थळाचा राहील");
      return;
    }
    setAppointBusy(true);
    setMsg(null);
    setError(null);
    try {
      await api("/api/members", {
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
      setMsg(
        `सत्संगी चरणसेवक नेमला · स्थळ ${selectedPlace?.name || ""}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "नेमणूक अयशस्वी");
    } finally {
      setAppointBusy(false);
    }
  }

  async function saveConductor() {
    if (!placeId) return;
    setDutyBusy(true);
    setMsg(null);
    setError(null);
    try {
      const data = await api<{
        rotate_hint?: string | null;
        members?: Member[];
      }>("/api/duties", {
        method: "PUT",
        body: JSON.stringify({
          place_id: placeId,
          meeting_date: date,
          charansevak_phone: dutyPhone,
          charansevak_name: dutyName || null,
        }),
      });
      if (data.members) setMembers(data.members);
      setRotateHint(data.rotate_hint || null);
      await loadDuties(date);
      setMsg("सत्संग संचालन चरणसेवक नेमला");
    } catch (e) {
      setError(e instanceof Error ? e.message : "नेमणूक अयशस्वी");
    } finally {
      setDutyBusy(false);
    }
  }

  async function selfCheckIn() {
    if (!placeId) return;
    setCheckinBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = await api<{ message: string; total: number }>(
        "/api/attendance/checkin",
        {
          method: "POST",
          body: JSON.stringify({ place_id: placeId, meeting_date: date }),
        },
      );
      setMsg(data.message);
      setTotal(data.total);
      await loadPeople(placeId, date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "उपस्थिती अयशस्वी");
    } finally {
      setCheckinBusy(false);
    }
  }

  async function makeShareLink() {
    if (!placeId) return;
    setLinkBusy(true);
    setError(null);
    try {
      const data = await api<{ url: string }>("/api/join-links", {
        method: "POST",
        body: JSON.stringify({ place_id: placeId, meeting_date: date }),
      });
      setLinkUrl(data.url);
      try {
        await navigator.clipboard.writeText(data.url);
        setMsg("लिंक कॉपी झाली — अ‍ॅप नसलेल्यांना पाठवा");
      } catch {
        setMsg("लिंक तयार");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "लिंक अयशस्वी");
    } finally {
      setLinkBusy(false);
    }
  }

  if (!canAssign && places.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">उपस्थिती</h2>
        <WeeklyTopics date={date} />
        <p className="rounded-2xl bg-saffron-50 p-4 text-sm text-temple-muted">
          तुमचे स्थळ अजून नोंदलेले नाही. संचालक / संवादक / चरणसेवक नेमणूक करतील
          — किंवा त्यांनी दिलेली स्थळ-लिंक वापरा. एकदा नाशिक (किंवा तुमचे स्थळ)
          नोंद झाली की तेच default राहील; दुसरे स्थळ निवडता येणार नाही.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-bold">उपस्थिती</h2>
        <p className="text-xs text-temple-muted">
          {roleLabelMarathi(profile.role)} · फक्त स्वतःची उपस्थिती · इतरांची लावता येणार
          नाही · आकडा आपोआप वाढेल
        </p>
      </div>

      <WeeklyTopics date={date} highlightPlaceId={placeId} />

      <PlaceDateBar
        places={places}
        placeId={placeId}
        date={date}
        onPlace={setPlaceId}
        onDate={setDate}
        locked={placeLocked}
      />

      {canAppoint ? (
        <section className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <h3 className="text-sm font-bold text-saffron-900">
            नवीन सत्संगी चरणसेवक नेमा
          </h3>
          <p className="text-[11px] text-temple-muted">
            नाव + मोबाइल · सध्या निवडलेल्या स्थळाचा (
            {selectedPlace?.name || "—"}) सत्संगी राहील
          </p>
          <input
            type="text"
            placeholder="नाव"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="मोबाइल"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="w-full rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <button
            type="button"
            disabled={appointBusy || !placeId}
            onClick={() => void appointMember()}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {appointBusy ? "नेमत आहे…" : "सत्संगी नेमा"}
          </button>
          {members.length ? (
            <p className="text-[11px] text-temple-muted">
              यादी: {members.length} सत्संगी
            </p>
          ) : null}
        </section>
      ) : null}

      {canAssign && placeId ? (
        <section className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-saffron-200">
          <h3 className="text-sm font-bold text-saffron-900">
            सत्संग संचालन चरणसेवक (गुरुवार)
          </h3>
          <p className="text-[11px] text-temple-muted">
            शक्यतो दर गुरुवारी वेगळा — अनिवार्य नाही
          </p>
          {members.length ? (
            <select
              className="w-full rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
              value=""
              onChange={(e) => {
                const m = members.find((x) => String(x.id) === e.target.value);
                if (!m) return;
                setDutyPhone(m.phone_display);
                setDutyName(m.name);
              }}
            >
              <option value="">यादीतून निवडा…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.phone_display}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="text"
            placeholder="नाव"
            value={dutyName}
            onChange={(e) => setDutyName(e.target.value)}
            className="w-full rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <input
            type="tel"
            placeholder="मोबाइल"
            value={dutyPhone}
            onChange={(e) => setDutyPhone(e.target.value)}
            className="w-full rounded-xl bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200"
          />
          <button
            type="button"
            disabled={dutyBusy}
            onClick={() => void saveConductor()}
            className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {dutyBusy ? "जतन…" : "संचालन नेमा"}
          </button>
          {rotateHint ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {rotateHint}
            </p>
          ) : null}
        </section>
      ) : null}

      {placeId ? (
        <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-saffron-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-temple-muted">एकूण उपस्थिती</p>
              <p className="text-4xl font-bold tabular-nums text-saffron-800">{total}</p>
              <p className="text-[11px] text-temple-muted">
                {selectedPlace?.name} · स्वयंचलित आकडा
              </p>
            </div>
            <button
              type="button"
              disabled={checkinBusy || myCheckedIn}
              onClick={() => void selfCheckIn()}
              className="rounded-2xl bg-saffron-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {myCheckedIn
                ? "नोंद झाली ✓"
                : checkinBusy
                  ? "…"
                  : "मी हजर आहे"}
            </button>
          </div>

          {canAppoint ? (
            <div className="space-y-2 border-t border-saffron-100 pt-3">
              <button
                type="button"
                disabled={linkBusy}
                onClick={() => void makeShareLink()}
                className="w-full rounded-full bg-saffron-50 py-2 text-xs font-semibold text-saffron-900 ring-1 ring-saffron-200 disabled:opacity-50"
              >
                {linkBusy ? "लिंक…" : "अ‍ॅप नसलेल्यांसाठी लिंक तयार करा"}
              </button>
              {linkUrl ? (
                <p className="break-all rounded-xl bg-saffron-50 px-2 py-2 text-[11px] text-saffron-900">
                  {linkUrl}
                </p>
              ) : null}
            </div>
          ) : null}

          {people.length ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-saffron-100 pt-2 text-xs">
              {people.map((p) => (
                <li key={p.phone} className="flex justify-between gap-2">
                  <span>
                    {p.name || "—"} · {p.phone_display}
                    {p.source === "link" ? " · लिंक" : ""}
                  </span>
                  {p.opinion ? (
                    <span className="truncate text-temple-muted" title={p.opinion}>
                      मत
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-temple-muted">अजून कोणी हजर नाही</p>
          )}
        </section>
      ) : null}

      {fullStaff ? (
        <p className="text-[11px] text-temple-muted">
          विषय / अहवाल मेनूमध्ये · स्थळ GPS संचालक/संवादक सेट करतात
        </p>
      ) : null}

      {msg ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
    </div>
  );
}
