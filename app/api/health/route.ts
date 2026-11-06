import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { hasWeakAuthSecrets, isVercelRuntime } from "@/lib/auth";
import {
  isWeakWhatsappVerifyToken,
  whatsappAppSecret,
  whatsappVerifyToken,
} from "@/lib/ajapa/webhook-security";
import { isProductionReady } from "@/lib/health";
import {
  whatsappDryRunEnabled,
  whatsappOutboundReady,
} from "@/lib/ajapa/whatsapp";
import {
  cookieSecureEnabled,
  isServingProduction,
  productionFileStoreBlockedReason,
  remoteDatabaseUrl,
} from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const weak = hasWeakAuthSecrets();
  const verify = whatsappVerifyToken();
  const secrets = {
    weak_admin_pin: weak.weakPin,
    weak_session_secret: weak.weakSessionSecret,
    whatsapp_verify_token_ok: Boolean(verify) && !isWeakWhatsappVerifyToken(verify),
    whatsapp_app_secret_set: Boolean(whatsappAppSecret()),
    vercel: isVercelRuntime(),
    production: isServingProduction(),
    cookie_secure: cookieSecureEnabled(),
  };

  let db: { ok: boolean; store: "turso" | "file"; error?: string } = {
    ok: false,
    store: remoteDatabaseUrl() ? "turso" : "file",
  };
  try {
    const ping = await pingDb();
    db = ping;
  } catch (err) {
    db = {
      ok: false,
      store: remoteDatabaseUrl() ? "turso" : "file",
      error: err instanceof Error ? err.message : "db error",
    };
  }

  const storeBlocked = productionFileStoreBlockedReason();
  const production_ready = isProductionReady({
    dbOk: db.ok,
    store: db.store,
    secrets,
  });

  const outbound = whatsappOutboundReady();
  const whatsapp = {
    outbound_ok: outbound.ok,
    provider: outbound.provider,
    dry_run: whatsappDryRunEnabled(),
    dry_run_ignored_in_production: outbound.dry_run_ignored,
    ...(outbound.reason ? { outbound_reason: outbound.reason } : {}),
  };

  const body = {
    ok: db.ok,
    name: "अजपा संवाद",
    db,
    secrets,
    whatsapp,
    production_ready,
    ...(storeBlocked && !db.ok ? { error: storeBlocked } : {}),
    ...(!storeBlocked && db.error ? { error: db.error } : {}),
  };

  return NextResponse.json(body, { status: db.ok ? 200 : 503 });
}
