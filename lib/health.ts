export type HealthStore = "turso" | "file";

export type HealthSecrets = {
  weak_admin_pin: boolean;
  weak_session_secret: boolean;
  whatsapp_verify_token_ok: boolean;
  whatsapp_app_secret_set: boolean;
  vercel: boolean;
  production: boolean;
  cookie_secure: boolean;
};

export function isProductionReady(input: {
  dbOk: boolean;
  store: HealthStore;
  secrets: HealthSecrets;
}): boolean {
  if (!input.dbOk) return false;
  if (input.secrets.weak_admin_pin || input.secrets.weak_session_secret) return false;
  if (input.secrets.production && !input.secrets.cookie_secure) return false;
  if (input.secrets.production && input.store !== "turso") return false;
  if (
    input.secrets.production &&
    (!input.secrets.whatsapp_verify_token_ok || !input.secrets.whatsapp_app_secret_set)
  ) {
    return false;
  }
  return true;
}
