import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/ajapa/bot";
import type { InboundWaMessage } from "@/lib/ajapa/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta webhook verification. */
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
        });
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const messages = parseInbound(body);
  const results = [];
  for (const msg of messages) {
    try {
      results.push(await processInboundMessage(msg));
    } catch (err) {
      console.error("Ajapa webhook error", err);
      results.push({ handled: false, error: String(err) });
    }
  }
  return NextResponse.json({ ok: true, results });
}
