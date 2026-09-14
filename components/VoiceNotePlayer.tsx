"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function extensionForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function mimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/);
  return m?.[1] || "audio/webm";
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Prefer formats that play on both iPhone and Android when possible. */
export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const apple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const order = apple
    ? ["audio/mp4", "audio/aac", "audio/wav", "audio/webm;codecs=opus", "audio/webm"]
    : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/aac"];
  for (const m of order) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

type Props = {
  src: string;
  label?: string;
  filenameBase?: string;
};

export function VoiceNotePlayer({
  src,
  label = "व्हॉइस नोट",
  filenameBase = "paramanand-voice",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mime = useMemo(() => mimeFromDataUrl(src), [src]);
  const filename = `${filenameBase}.${extensionForMime(mime)}`;

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setError(null);
    setBlobUrl(null);

    void (async () => {
      try {
        const blob = await dataUrlToBlob(src);
        if (cancelled) return;
        if (blob.size < 64) {
          setError("व्हॉइस फाइल रिकामी / खराब आहे — पुन्हा रेकॉर्ड करा");
          return;
        }
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch {
        if (!cancelled) setBlobUrl(src);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  async function playLoud() {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    try {
      el.muted = false;
      el.volume = 1;
      await el.play();
    } catch {
      setError("या फोनवर प्ले अयशस्वी — डाउनलोड / शेअर करून ऐका");
    }
  }

  async function downloadOrShare() {
    setBusy(true);
    setError(null);
    try {
      const blob = await dataUrlToBlob(src);
      const file = new File([blob], filename, { type: blob.type || mime });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: label,
          text: "परमानंद धाम · व्हॉइस नोट",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      // iOS fallback: open in new tab
      try {
        window.open(src, "_blank");
      } catch {
        setError("डाउनलोड अयशस्वी — पुन्हा प्रयत्न करा");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-emerald-50/80 p-3 ring-1 ring-emerald-100">
      <p className="text-xs font-semibold text-emerald-900">{label}</p>
      {blobUrl ? (
        <audio
          ref={audioRef}
          key={blobUrl}
          controls
          playsInline
          preload="auto"
          src={blobUrl}
          className="w-full"
          onError={() =>
            setError("आवाज प्ले होत नाही (फॉरमॅट) — डाउनलोड / शेअर करा")
          }
        />
      ) : (
        <p className="text-xs text-temple-muted">व्हॉइस लोड…</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void playLoud()}
          className="rounded-full bg-saffron-700 px-3 py-1.5 text-xs font-bold text-white"
        >
          ऐका
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadOrShare()}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-saffron-900 ring-1 ring-saffron-300 disabled:opacity-50"
        >
          {busy ? "…" : "डाउनलोड / शेअर"}
        </button>
      </div>
      {error ? <p className="text-[11px] font-semibold text-red-700">{error}</p> : null}
      <p className="text-[10px] text-temple-muted">
        पुढील गुरुवारानंतर सर्वरवर राहत नाही · आवाज नसेल तर डाउनलोड करा
      </p>
    </div>
  );
}
