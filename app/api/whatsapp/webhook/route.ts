import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/ajapa/bot";
import type { InboundWaMessage } from "@/lib/ajapa/types";
import {
  claimWhatsappMessageId,
  isWeakWhatsappVerifyToken,
  verifyMetaSignature,
  whatsappAppSecret,
  whatsappVerifyToken,
} from "@/lib/ajapa/webhook-security";
import { isServingProduction } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta webhook verification — no default token in production. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = whatsappVerifyToken();

  if (isServingProduction() && isWeakWhatsappVerifyToken(expected)) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN not configured" },
      { status: 503 },
    );
  }

  const effective = expected || (!isServingProduction() ? "ajapa-verify-dev-only" : "");
  if (mode === "subscribe" && token && effective && token === effective && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WaChange = {
  value?: {
    messages?: {
      id?: string;
      from?: string;
      type?: string;
      text?: { body?: string };
      audio?: { id?: string };
      button?: { text?: string };
      interactive?: { button_reply?: { id?: string; title?: string } };
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
        else if (msg.type === "button") text = msg.button?.text;
        else if (msg.type === "interactive") {
          text =
            msg.interactive?.button_reply?.title || msg.interactive?.button_reply?.id;
        }
        out.push({
          from: msg.from,
          text,
          audioMediaId: msg.type === "audio" ? msg.audio?.id : undefined,
          profileName: name,
          messageId: msg.id,
        });
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = whatsappAppSecret();

  // Fail closed in production without app secret; local may skip if unset.
  if (isServingProduction() && !secret) {
    return NextResponse.json(
      { error: "WHATSAPP_APP_SECRET not configured" },
      { status: 503 },
    );
  }
  if (secret) {
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, sig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ ok: true });

  const messages = parseInbound(body);
  const results = [];
  for (const msg of messages) {
    try {
      if (msg.messageId) {
        const fresh = await claimWhatsappMessageId(msg.messageId);
        if (!fresh) {
          results.push({ handled: true, duplicate: true, wamid: msg.messageId });
          continue;
        }
      }
      results.push(await processInboundMessage(msg));
    } catch (err) {
      console.error("Ajapa webhook error", err);
      results.push({ handled: false, error: String(err) });
    }
  }
  return NextResponse.json({ ok: true, results });
}
