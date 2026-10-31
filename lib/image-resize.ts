import { MAX_UPLOAD_BYTES } from "./events";

export const FULL_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 400;

export type ResizedImage = { blob: Blob; width: number; height: number };

type Decoded = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Safari < 17 / HEIC edge cases — fall back to <img>
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("हे चित्र उघडता आले नाही"));
    };
    img.src = url;
  });
}

function dims(src: Decoded): { w: number; h: number } {
  if ("naturalWidth" in src) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("चित्र तयार करता आले नाही"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Downscale to `maxEdge` and re-encode as JPEG (white matte for transparent PNGs). */
export async function resizeImage(
  file: File,
  maxEdge: number,
  qualities: number[],
  maxBytes = Infinity,
): Promise<ResizedImage> {
  const src = await decode(file);
  const { w: sw, h: sh } = dims(src);
  if (!sw || !sh) throw new Error("हे चित्र उघडता आले नाही");
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas उपलब्ध नाही");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(src, 0, 0, width, height);
  if ("close" in src) src.close();

  let blob: Blob | null = null;
  for (const q of qualities) {
    blob = await encode(canvas, q);
    if (blob.size <= maxBytes) break;
  }
  if (!blob || blob.size > maxBytes) throw new Error("चित्र खूप मोठे आहे");
  return { blob, width, height };
}

export function resizeForUpload(file: File): Promise<ResizedImage> {
  return resizeImage(file, FULL_MAX_EDGE, [0.82, 0.72, 0.6, 0.5], MAX_UPLOAD_BYTES);
}

export function resizeForThumb(file: File): Promise<ResizedImage> {
  return resizeImage(file, THUMB_MAX_EDGE, [0.75]);
}
