import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Digital Asset Links for Play Store Trusted Web Activity. */
export async function GET() {
  const fromEnv = (process.env.PLAY_STORE_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/:/g, ""))
    .filter(Boolean);

  let fingerprints = fromEnv;
  if (fingerprints.length === 0) {
    try {
      const raw = await readFile(
        path.join(process.cwd(), "public/.well-known/assetlinks.json"),
        "utf8",
      );
      const parsed = JSON.parse(raw) as {
        target?: { sha256_cert_fingerprints?: string[] };
      }[];
      fingerprints = parsed[0]?.target?.sha256_cert_fingerprints || [];
    } catch {
      fingerprints = [];
    }
  }

  // Bubblewrap / Android expect colon-separated uppercase often; both work if consistent.
  const colon = fingerprints.map((fp) =>
    fp.includes(":")
      ? fp.toUpperCase()
      : (fp.match(/.{1,2}/g) || []).join(":").toUpperCase(),
  );

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "in.dhyeyapurti.satsang",
        sha256_cert_fingerprints: colon.length ? colon : fingerprints,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
