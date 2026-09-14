import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/ajapa/bot";
import { forwardToLegacyBot } from "@/lib/ajapa/legacy-forward";
import type { InboundWaMessage } from "@/lib/ajapa/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta webhook verification.
 * Keep the SAME verify token the old Team Dhyeyapurti bot already uses in Meta,
 * or Meta will break the subscription. Prefer WHATSAPP_VERIFY_TOKEN from env.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || "ajapa-verify";

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WaChange = {
  value?: {
    messages?: {
      from?: string;
      type?: string;
      text?: { body?: string };
      audio?: { id?: string };
      button?: { text?: string; payload?: string };
      interactive?: {
        button_reply?: { id?: string; title?: string };
        list_reply?: { id?: string; title?: string };
      };
    }[];
    contacts?: { profile?: { name?: string }; wa_id?: string }[];
  };
};

function parseInbound(body: unknown): InboundWaMessage[] {
  const out: InboundWaMessage[] = [];
  const root = body as { entry?: { changes?: WaChange[] }[] };
  for (const entry of root.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const name = value.contacts?.[0]?.profile?.name;
      for (const msg of value.messages) {
        if (!msg.from) continue;
        let text: string | undefined;
        if (msg.type === "text") text = msg.text?.body;
        else if (msg.type === "button") {
          text = msg.button?.payload || msg.button?.text;
        } else if (msg.type === "interactive") {
          text =
            msg.interactive?.button_reply?.id ||
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.id ||
            msg.interactive?.list_reply?.title;
        }
        out.push({
          from: msg.from,
          text,
          audioMediaId: msg.type === "audio" ? msg.audio?.id : undefined,
          profileName: name,
        });
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Always 200 to Meta quickly — never break the old subscription.
  if (!body) return NextResponse.json({ ok: true });

  const messages = parseInbound(body);
  // Status-only webhooks (delivered/read) — pass through to legacy bot.
  if (!messages.length) {
    const legacy = await forwardToLegacyBot(body);
    return NextResponse.json({ ok: true, passthrough: "status", legacy });
  }

  const results = [];
  let anyUnhandled = false;

  for (const msg of messages) {
    try {
      const result = await processInboundMessage(msg);
      results.push(result);
      if (!result.handled) anyUnhandled = true;
    } catch (err) {
      console.error("Ajapa webhook error", err);
      results.push({ handled: false, error: String(err) });
      anyUnhandled = true;
    }
  }

  // hi / 1–9 / मतदार flow → जुना Team Dhyeyapurti बॉट (अस्पर्श)
  let legacy: Awaited<ReturnType<typeof forwardToLegacyBot>> | undefined;
  if (anyUnhandled) {
    legacy = await forwardToLegacyBot(body);
  }

  return NextResponse.json({ ok: true, results, legacy });
}
