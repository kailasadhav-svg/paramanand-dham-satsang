"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/PhotoLightbox";
import { api } from "@/lib/api";
import { formatMarathiShort } from "@/lib/dates";
import { resizeForThumb, resizeForUpload } from "@/lib/image-resize";
import { PHOTOS_LABEL } from "@/lib/labels";

type EventOption = { id: number; title: string; event_date: string };

const EMPTY_FORM = { image_url: "", caption: "", taken_on: "", event_id: "" };

const inputClass =
  "mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-normal text-temple-ink ring-1 ring-saffron-200";

export default function PhotosPage() {
  const [photos, setPhotos] = useState<LightboxPhoto[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await api<{ photos: LightboxPhoto[]; can_manage: boolean }>("/api/photos");
    setPhotos(data.photos);
    setCanManage(data.can_manage);
    setLoaded(true);
    if (data.can_manage) {
      const ev = await api<{ events: EventOption[] }>("/api/events");
      setEvents(ev.events);
    }
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, [load]);

  async function uploadOne(file: File) {
    const [full, thumb] = await Promise.all([resizeForUpload(file), resizeForThumb(file)]);
    const fd = new FormData();
    fd.append("image", full.blob, "photo.jpg");
    fd.append("thumb", thumb.blob, "thumb.jpg");
    fd.append("width", String(full.width));
    fd.append("height", String(full.height));
    fd.append("caption", form.caption);
    fd.append("taken_on", form.taken_on);
    fd.append("event_id", form.event_id);
    const res = await fetch("/api/photos/upload", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || `त्रुटी ${res.status}`);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFiles([]);
    setShowLink(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (files.length === 0 && !form.image_url.trim()) {
      setError("फोनवरून फोटो निवडा किंवा लिंक द्या");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (files.length) {
        for (let i = 0; i < files.length; i++) {
          setProgress({ done: i, total: files.length });
          await uploadOne(files[i]);
        }
      } else {
        await api("/api/photos", { method: "POST", body: JSON.stringify(form) });
      }
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "जतन अयशस्वी");
      await load().catch(() => undefined);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function remove(photo: LightboxPhoto) {
    if (!window.confirm("हे छायाचित्र काढायचे?")) return;
    setError(null);
    try {
      await api(`/api/photos/${photo.id}`, { method: "DELETE" });
      setOpen(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "काढता आले नाही");
    }
  }

  const submitLabel = saving
    ? progress
      ? `${progress.done + 1} / ${progress.total} अपलोड होत आहे…`
      : "जतन होत आहे…"
    : files.length > 1
      ? `${files.length} फोटो अपलोड करा`
      : "फोटो जोडा";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">सत्संग {PHOTOS_LABEL}</h2>
          <p className="text-xs text-temple-muted">
            {loaded ? `${photos.length} छायाचित्रे · मोठे पाहण्यासाठी टॅप करा` : "लोड होत आहे…"}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="shrink-0 rounded-full border border-saffron-200 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800"
          >
            {showForm ? "रद्द" : "+ नवीन"}
          </button>
        ) : null}
      </div>

      {canManage && showForm ? (
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block text-xs font-semibold text-temple-muted">
            फोनवरून फोटो (एक किंवा अनेक)
            <span className="mt-1 flex items-center gap-3">
              <span className="shrink-0 rounded-full bg-saffron-100 px-4 py-2 text-xs font-semibold text-saffron-800">
                फोटो निवडा
              </span>
              <span className="min-w-0 text-xs font-normal leading-snug text-temple-ink">
                {files.length
                  ? `${files.length} फोटो निवडले · अपलोडपूर्वी आपोआप लहान केले जातील`
                  : "कॅमेरा किंवा गॅलरीतून"}
              </span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              disabled={saving}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowLink((s) => !s)}
            className="text-xs font-semibold text-saffron-800 underline"
          >
            {showLink ? "लिंक लपवा" : "किंवा लिंक चिकटवा"}
          </button>
          {showLink ? (
            <label className="block text-xs font-semibold text-temple-muted">
              छायाचित्राची लिंक (http/https)
              <input
                type="url"
                inputMode="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className={inputClass}
                placeholder="https://…/photo.jpg"
              />
            </label>
          ) : null}
          <label className="block text-xs font-semibold text-temple-muted">
            वर्णन
            <input
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              className={inputClass}
              placeholder="उदा. आरती · नाशिक"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-temple-muted">
              तारीख
              <input
                type="date"
                value={form.taken_on}
                onChange={(e) => setForm({ ...form, taken_on: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-temple-muted">
              कार्यक्रम
              <select
                value={form.event_id}
                onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                className={inputClass}
              >
                <option value="">— नाही —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {formatMarathiShort(ev.event_date)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-saffron-700 py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loaded && photos.length === 0 ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-sm text-temple-muted">
          अद्याप छायाचित्रे नाहीत.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={p.caption || `छायाचित्र ${i + 1}`}
                className="block w-full overflow-hidden rounded-xl bg-saffron-50 shadow-card ring-1 ring-saffron-200/70"
              >
                <img
                  src={p.thumb_url}
                  alt={p.caption || ""}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-square w-full object-cover"
                />
              </button>
              {p.caption ? (
                <p className="mt-1 truncate text-xs text-temple-muted">{p.caption}</p>
              ) : null}
              {canManage ? (
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  aria-label="छायाचित्र काढा"
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-red-700 shadow"
                >
                  काढा
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {open !== null ? (
        <PhotoLightbox
          photos={photos}
          index={open}
          onClose={() => setOpen(null)}
          onIndex={setOpen}
        />
      ) : null}
    </div>
  );
}
