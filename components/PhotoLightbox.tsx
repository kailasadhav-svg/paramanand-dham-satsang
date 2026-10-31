"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatMarathiDate } from "@/lib/dates";

export type LightboxPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  taken_on: string | null;
  event_title: string | null;
};

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndex: (next: number) => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && hasNext) onIndex(index + 1);
      else if (e.key === "ArrowLeft" && hasPrev) onIndex(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onClose, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!photo || typeof document === "undefined") return null;

  const meta = [
    photo.event_title,
    photo.taken_on ? formatMarathiDate(photo.taken_on) : null,
  ].filter(Boolean);

  // Portal: a parent `space-y-*` margin would otherwise offset the fixed overlay.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || "छायाचित्र"}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-sm">
        <span className="tabular-nums text-white/80">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold"
        >
          बंद
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <img
          src={photo.image_url}
          alt={photo.caption || ""}
          referrerPolicy="no-referrer"
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div
        className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.caption ? (
          <p className="text-center text-sm leading-snug">{photo.caption}</p>
        ) : null}
        {meta.length ? (
          <p className="text-center text-xs text-white/70">{meta.join(" · ")}</p>
        ) : null}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => onIndex(index - 1)}
            className="flex-1 rounded-2xl bg-white/15 py-3 text-sm font-semibold disabled:opacity-30"
          >
            ‹ मागील
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onIndex(index + 1)}
            className="flex-1 rounded-2xl bg-saffron-700 py-3 text-sm font-semibold disabled:opacity-30"
          >
            पुढील ›
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
