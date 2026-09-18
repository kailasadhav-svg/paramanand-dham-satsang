/** Production / deploy detection — not Vercel-only (satsang.dhyeyapurti.in is nginx). */

export type EnvLike = Record<string, string | undefined>;

export function isVercelRuntime(env: EnvLike = process.env): boolean {
  return Boolean(env.VERCEL);
}

export function isProductionBuildPhase(env: EnvLike = process.env): boolean {
  return env.NEXT_PHASE === "phase-production-build";
}

/**
 * True when the process should enforce production security gates.
 * `next build` is excluded so missing Turso env does not break compile.
 */
export function isServingProduction(env: EnvLike = process.env): boolean {
  if (isProductionBuildPhase(env)) return false;
  if (env.FORCE_PRODUCTION_GATES === "1" || env.FORCE_PRODUCTION_GATES === "true") {
    return true;
  }
  return env.NODE_ENV === "production" || isVercelRuntime(env);
}

export function allowFileStore(env: EnvLike = process.env): boolean {
  return env.ALLOW_FILE_STORE === "1" || env.ALLOW_FILE_STORE === "true";
}

export function cookieSecureEnabled(env: EnvLike = process.env): boolean {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return isServingProduction(env);
}

export function remoteDatabaseUrl(env: EnvLike = process.env): string | undefined {
  return env.TURSO_DATABASE_URL || env.LIBSQL_URL || undefined;
}

export function productionFileStoreBlockedReason(env: EnvLike = process.env): string | null {
  if (!isServingProduction(env)) return null;
  if (remoteDatabaseUrl(env)) return null;
  if (allowFileStore(env)) return null;
  return "Production requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (file SQLite does not persist across deploys/instances). Set Turso env, or ALLOW_FILE_STORE=1 only for a single persistent VPS disk.";
}
