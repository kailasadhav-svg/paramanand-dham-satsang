import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { hasWeakAuthSecrets, isVercelRuntime } from "@/lib/auth";
import {
  isWeakWhatsappVerifyToken,
  whatsappAppSecret,
  whatsappVerifyToken,
} from "@/lib/ajapa/webhook-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await pingDb();
    const weak = hasWeakAuthSecrets();
    const verify = whatsappVerifyToken();
    const secrets = {
      weak_admin_pin: weak.weakPin,
      weak_session_secret: weak.weakSessionSecret,
      whatsapp_verify_token_ok: Boolean(verify) && !isWeakWhatsappVerifyToken(verify),
      whatsapp_app_secret_set: Boolean(whatsappAppSecret()),
      vercel: isVercelRuntime(),
    };
    const production_ready =
      !secrets.weak_admin_pin &&
      !secrets.weak_session_secret &&
      (!secrets.vercel ||
        (secrets.whatsapp_verify_token_ok && secrets.whatsapp_app_secret_set));

    return NextResponse.json({
      ok: true,
      name: "अजपा संवाद",
      db,
      secrets,
      production_ready,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db error";
    return NextResponse.json(
      { ok: false, name: "अजपा संवाद", error: message },
      { status: 503 },
    );
  }
}
