/**
 * Forward unhandled WhatsApp webhooks to the existing Team Dhyeyapurti bot
 * (मतदार / SIR सेवा) so it keeps running on the same number.
 *
 * Set LEGACY_WHATSAPP_WEBHOOK_URL to the old bot's webhook URL
 * (Dove Soft / Turiya / previous Meta callback).
 */
export async function forwardToLegacyBot(
  body: unknown,
): Promise<{ forwarded: boolean; status?: number; error?: string }> {
  const url = (process.env.LEGACY_WHATSAPP_WEBHOOK_URL || "").trim();
  if (!url) {
    return { forwarded: false, error: "LEGACY_WHATSAPP_WEBHOOK_URL not set" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "paramanand-ajapa-passthrough/1.0",
        // Preserve Meta signature if present on the original request via env inject later
        ...(process.env.LEGACY_WEBHOOK_EXTRA_HEADERS
          ? JSON.parse(process.env.LEGACY_WEBHOOK_EXTRA_HEADERS)
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    return { forwarded: true, status: res.status };
  } catch (err) {
    console.error("Legacy bot forward failed", err);
    return {
      forwarded: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
