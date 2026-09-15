/** Best-effort in-memory rate limit (per serverless isolate). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size < MAX_KEYS) return;
  const keys = [...buckets.keys()].slice(0, Math.floor(buckets.size / 2));
  for (const k of keys) buckets.delete(k);
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") || "unknown";
}
