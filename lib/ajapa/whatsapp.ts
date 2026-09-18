import type { AjapaQuestion } from "./types";
import { GUIDE_QUEUE_LABEL } from "../labels.ts";
import { isServingProduction } from "../runtime.ts";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export type WaSendResult =
  | { ok: true; id?: string; via?: "meta" | "turiya" | "dry-run" }
  | { ok: false; error: string; skipped?: boolean };

type WaCfg = {
  provider: "meta" | "turiya";
  token: string;
  phoneNumberId: string;
  apiBase: string;
  dryRun: boolean;
  forceTemplates: boolean;
  turiyaKey: string;
  turiyaWaba: string;
  turiyaBase: string;
};

/** Dry-run only in local/dev — never silently swallow sends on VPS / Vercel. */
export function whatsappDryRunEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.WHATSAPP_DRY_RUN === "1" || env.WHATSAPP_DRY_RUN === "true";
  if (!raw) return false;
  if (isServingProduction(env)) return false;
  return true;
}

function cfg(env: NodeJS.ProcessEnv = process.env): WaCfg {
  const providerRaw = (env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  const provider = providerRaw === "turiya" ? "turiya" : "meta";
  return {
    provider,
    token: env.WHATSAPP_TOKEN || env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
    apiBase: (
      env.WHATSAPP_API_BASE || `https://graph.facebook.com/${GRAPH_VERSION}`
    ).replace(/\/$/, ""),
    dryRun: whatsappDryRunEnabled(env),
    forceTemplates: env.WHATSAPP_FORCE_TEMPLATES === "1",
    turiyaKey: env.TURIYA_API_KEY || "",
    turiyaWaba: env.TURIYA_WABA_NUMBER || "917030111501",
    turiyaBase: (env.TURIYA_API_BASE || "https://app.turiyainfotech.com").replace(
      /\/$/,
      "",
    ),
  };
}

/** True when outbound WhatsApp can actually deliver (or safe local dry-run). */
export function whatsappConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const c = cfg(env);
  if (c.dryRun) return true;
  if (c.provider === "turiya") return Boolean(c.turiyaKey && c.turiyaWaba);
  return Boolean(c.token && c.phoneNumberId);
}

/** Production health: outbound send credentials present (ignores dry-run). */
export function whatsappOutboundReady(env: NodeJS.ProcessEnv = process.env): {
  ok: boolean;
  provider: "meta" | "turiya";
  dry_run_ignored: boolean;
  reason?: string;
} {
  const c = cfg(env);
  const dryIgnored =
    (env.WHATSAPP_DRY_RUN === "1" || env.WHATSAPP_DRY_RUN === "true") &&
    isServingProduction(env);
  if (c.provider === "turiya") {
    if (c.turiyaKey && c.turiyaWaba) {
      return { ok: true, provider: "turiya", dry_run_ignored: dryIgnored };
    }
    return {
      ok: false,
      provider: "turiya",
      dry_run_ignored: dryIgnored,
      reason: "TURIYA_API_KEY (and TURIYA_WABA_NUMBER) required",
    };
  }
  if (c.token && c.phoneNumberId) {
    return { ok: true, provider: "meta", dry_run_ignored: dryIgnored };
  }
  return {
    ok: false,
    provider: "meta",
    dry_run_ignored: dryIgnored,
    reason: "WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID required",
  };
}

async function postMeta(body: Record<string, unknown>): Promise<WaSendResult> {
  const c = cfg();
  if (!c.token || !c.phoneNumberId) {
    return { ok: false, error: "WhatsApp Meta not configured", skipped: true };
  }
  const url = `${c.apiBase}/${c.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...body,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("WhatsApp Meta send failed", res.status, err.slice(0, 500));
    return { ok: false, error: err || `HTTP ${res.status}` };
  }
  const data = (await res.json()) as { messages?: { id?: string }[] };
  return { ok: true, id: data.messages?.[0]?.id, via: "meta" };
}

/**
 * Turiya Infotech / Dove Soft directApi — same path as Team Dhyeyapurti bot
 * (`/REST/directApi/message`, Key + wabaNumber headers, Meta-shaped JSON).
 */
async function postTuriya(body: Record<string, unknown>): Promise<WaSendResult> {
  const c = cfg();
  if (!c.turiyaKey || !c.turiyaWaba) {
    return { ok: false, error: "WhatsApp Turiya not configured", skipped: true };
  }
  const host = c.turiyaBase.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${host}/REST/directApi/message`;
  const payload: Record<string, unknown> = {
    ...body,
    to: String(body.to || "").replace(/\D/g, ""),
  };
  // Match TDP send_template language.policy for AUTHENTICATION OTP reliability
  if (payload.type === "template" && payload.template && typeof payload.template === "object") {
    const tpl = payload.template as Record<string, unknown>;
    const lang = (tpl.language as Record<string, unknown> | undefined) || {};
    tpl.language = { policy: "deterministic", ...lang };
    payload.template = tpl;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Key: c.turiyaKey,
      wabaNumber: c.turiyaWaba.replace(/\D/g, ""),
      "Content-Type": "application/json",
      Accept: "application/json, */*",
      "User-Agent":
        "Mozilla/5.0 (compatible; ParamanandDhamSatsang/1.0; +https://satsang.dhyeyapurti.in)",
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("WhatsApp Turiya send failed", res.status, raw.slice(0, 500));
    return { ok: false, error: raw.slice(0, 300) || `HTTP ${res.status}` };
  }
  try {
    const data = JSON.parse(raw) as {
      status?: string;
      messageId?: string;
      message_id?: string;
      id?: string;
      error?: string;
    };
    const status = String(data.status || "").toLowerCase();
    if (status === "error" || status === "fail" || status === "failed" || status === "false" || data.error) {
      return {
        ok: false,
        error: data.error || raw.slice(0, 300) || status,
      };
    }
    return {
      ok: true,
      id: data.messageId || data.message_id || data.id,
      via: "turiya",
    };
  } catch {
    if (/fail|error|invalid/i.test(raw) && !/success/i.test(raw)) {
      return { ok: false, error: raw.slice(0, 300) };
    }
    return { ok: true, via: "turiya" };
  }
}

async function postMessage(body: Record<string, unknown>): Promise<WaSendResult> {
  const c = cfg();
  if (c.dryRun) {
    console.info("[whatsapp:dry-run]", JSON.stringify(body).slice(0, 800));
    return { ok: true, id: "dry-run", via: "dry-run" };
  }

  if (c.provider === "turiya") {
    return postTuriya(body);
  }

  return postMeta(body);
}

const MESSAGE_FOOTER = "\n\n|| हरि ॐ परमानंद विश्वव्यापकम् ||";

export function withFooter(body: string): string {
  const trimmed = body.trimEnd();
  if (trimmed.includes("हरि ॐ परमानंद विश्वव्यापकम्")) return trimmed;
  return `${trimmed}${MESSAGE_FOOTER}`;
}

export async function sendText(to: string, body: string): Promise<WaSendResult> {
  return postMessage({
    to,
    type: "text",
    text: { preview_url: false, body: withFooter(body).slice(0, 4096) },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<WaSendResult> {
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: withFooter(body).slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendTemplate(
  to: string,
  name: string,
  bodyParams: string[],
  languageCode = "mr",
): Promise<WaSendResult> {
  return postMessage({
    to,
    type: "template",
    template: {
      name,
      language: { code: languageCode },
      components: bodyParams.length
        ? [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({
                type: "text",
                text: text.slice(0, 1024),
              })),
            },
          ]
        : [],
    },
  });
}

/**
 * Meta AUTHENTICATION OTP templates require the code in both body and button
 * (copy_code is stored as URL subtype after approval).
 */
export async function sendAuthenticationOtpTemplate(opts: {
  to: string;
  name: string;
  code: string;
  languageCode?: string;
}): Promise<WaSendResult> {
  const code = String(opts.code || "").replace(/\D/g, "").slice(0, 15);
  const languageCode =
    opts.languageCode ||
    process.env.WHATSAPP_OTP_LANG ||
    process.env.WHATSAPP_OTP_LANGUAGE ||
    "en_US";
  return postMessage({
    to: opts.to,
    type: "template",
    template: {
      name: opts.name,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  });
}

export async function sendAudioById(to: string, mediaId: string): Promise<WaSendResult> {
  return postMessage({
    to,
    type: "audio",
    audio: { id: mediaId },
  });
}

function within24h(lastInboundAt: string | null | undefined): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

export async function sendSmart(opts: {
  to: string;
  text: string;
  lastInboundAt: string | null | undefined;
  templateName: string;
  templateParams: string[];
}): Promise<WaSendResult> {
  const c = cfg();
  if (!c.forceTemplates && within24h(opts.lastInboundAt)) {
    return sendText(opts.to, opts.text);
  }
  const tpl = await sendTemplate(opts.to, opts.templateName, opts.templateParams);
  if (tpl.ok) return tpl;
  return sendText(opts.to, opts.text);
}

/**
 * OTP delivery for app login / escalate.
 * Prefer Meta AUTHENTICATION OTP template (already approved on WABA), then
 * Utility templates, then free-form text inside a 24h session.
 *
 * WHATSAPP_OTP_TEMPLATE may be a single name or comma-separated list.
 * Languages tried: WHATSAPP_OTP_LANG first, then en / en_US / mr / hi.
 */
export async function sendOtpMessage(opts: {
  to: string;
  code: string;
  lastInboundAt?: string | null;
  purpose?: "actor_bind" | "escalate";
}): Promise<WaSendResult> {
  const code = String(opts.code || "").replace(/\D/g, "").slice(0, 8);
  if (code.length < 4) {
    return { ok: false, error: "invalid OTP code" };
  }

  const envNames = (process.env.WHATSAPP_OTP_TEMPLATE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Team Dhyeyapurti APPROVED AUTHENTICATION OTP (Turiya getTemplateList): home_login_otp / en_US
  const candidateNames = (
    envNames.length
      ? envNames
      : ["home_login_otp", "ajapa_app_otp", "otp", "otp_verification", "verify_code"]
  ).filter((name, i, arr) => name && arr.indexOf(name) === i);

  const authMode =
    process.env.WHATSAPP_OTP_AUTH !== "0" &&
    process.env.WHATSAPP_OTP_AUTH !== "false";

  const preferredLang =
    process.env.WHATSAPP_OTP_LANG ||
    process.env.WHATSAPP_OTP_LANGUAGE ||
    "";
  // home_login_otp is en_US on Meta; keep that first when env unset
  const languages = [preferredLang, "en_US", "en", "mr", "hi"]
    .map((s) => s.trim())
    .filter((lang, i, arr) => lang && arr.indexOf(lang) === i);

  let lastErr = "OTP template send failed";

  // 1) Approved Meta AUTHENTICATION OTP templates (body + copy-code button)
  if (authMode) {
    for (const name of candidateNames) {
      for (const languageCode of languages) {
        const auth = await sendAuthenticationOtpTemplate({
          to: opts.to,
          name,
          code,
          languageCode,
        });
        if (auth.ok) return auth;
        lastErr = ("error" in auth ? auth.error : null) || lastErr;
        // Wrong template name → stop trying languages for this name quickly
        if (/not exist|does not exist|template name|invalid parameter/i.test(lastErr)) {
          break;
        }
      }
    }
  }

  // 2) Open session → free-form text is allowed
  const sessionOpen = within24h(opts.lastInboundAt) && !cfg().forceTemplates;
  if (sessionOpen) {
    const label =
      opts.purpose === "escalate"
        ? "मधुसुदनदास उत्तर OTP"
        : "अ‍ॅप लॉगिन OTP";
    const text = `परमानंद धाम · ${label}\n\nमोबाइल खात्री OTP: *${code}*\n\nअ‍ॅपमध्ये टाका (१० मिनिटे वैध).`;
    const live = await sendText(opts.to, text);
    if (live.ok) return live;
    lastErr = ("error" in live ? live.error : null) || lastErr;
  }

  // 3) Utility templates (custom Marathi body)
  for (const name of ["ajapa_app_otp", "ajapa_welcome_code", ...envNames].filter(
    (n, i, a) => n && a.indexOf(n) === i,
  )) {
    for (const languageCode of languages) {
      const tpl = await sendTemplate(opts.to, name, [code], languageCode);
      if (tpl.ok) return tpl;
      lastErr = ("error" in tpl ? tpl.error : null) || lastErr;
      if (/not exist|does not exist|template name|invalid parameter/i.test(lastErr)) {
        break;
      }
    }
  }

  // 4) Last resort free-form
  const text = `परमानंद धाम\n\nOTP: *${code}*\n\nअ‍ॅपमध्ये टाका (१० मिनिटे वैध).`;
  const fallback = await sendText(opts.to, text);
  if (fallback.ok) return fallback;
  return {
    ok: false,
    error:
      ("error" in fallback ? fallback.error : null) ||
      lastErr ||
      "OTP WhatsApp पाठवता आला नाही",
  };
}

export function truncateParam(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export async function notifyAiAnswer(opts: {
  to: string;
  lastInboundAt: string | null;
  question: AjapaQuestion;
}): Promise<void> {
  const q = truncateParam(opts.question.question, 120);
  const full = opts.question.ai_answer || "";
  if (within24h(opts.lastInboundAt) && !cfg().forceTemplates) {
    await sendText(opts.to, full);
  } else {
    await sendTemplate(opts.to, "ajapa_ai_answer", [q]);
  }
}

export async function askEscalate(opts: {
  to: string;
  lastInboundAt: string | null;
  questionShort: string;
}): Promise<void> {
  const body =
    "मधुसुदनदास विजयानंद यांच्याकडून उत्तर हवे असेल तर खालील बटण निवडा (किंवा `1` दाबा).";
  if (within24h(opts.lastInboundAt) && !cfg().forceTemplates) {
    await sendButtons(opts.to, body, [
      // WhatsApp interactive title ≤20 chars (full label on Meta template)
      { id: "ajapa_escalate", title: GUIDE_QUEUE_LABEL },
      { id: "ajapa_enough", title: "पुरे आहे" },
      { id: "ajapa_open_app", title: "अ‍ॅप उघडा" },
    ]);
    return;
  }
  await sendSmart({
    to: opts.to,
    lastInboundAt: opts.lastInboundAt,
    text: body,
    templateName: "ajapa_ask_madhusudan",
    templateParams: [truncateParam(opts.questionShort, 120)],
  });
}

export async function askGuruReplyMode(opts: {
  to: string;
  lastInboundAt: string | null;
  seekerLabel: string;
}): Promise<void> {
  const body = `चरणसेवक ${opts.seekerLabel} — उत्तर कसे द्याल?`;
  if (within24h(opts.lastInboundAt) && !cfg().forceTemplates) {
    await sendButtons(opts.to, body, [
      { id: "ajapa_type", title: "टाइप करा" },
      { id: "ajapa_voice", title: "व्हॉइस नोट" },
      { id: "ajapa_cancel", title: "रद्द" },
    ]);
    return;
  }
  await sendText(
    opts.to,
    `${body}\n\`1\` = टाइप · \`2\` = व्हॉइस (किंवा टेम्प्लेट बटण: ajapa_guru_reply_choice)`,
  );
}

export async function notifyGuruNewQuestion(opts: {
  to: string;
  lastInboundAt: string | null;
  seekerPhone: string;
  question: string;
  aiAnswer: string;
}): Promise<void> {
  const short = truncateParam(`चरणसेवक ${opts.seekerPhone}: ${opts.question}`, 200);
  const text = `नवा अजपा प्रश्न (एस्केलेट)
चरणसेवक: ${opts.seekerPhone}

प्रश्न:
${opts.question}

परमानंद साहित्य उत्तर (संक्षेप):
${truncateParam(opts.aiAnswer, 800)}

उत्तर देण्यासाठी लिहा:
अजपा A ${opts.seekerPhone}`;
  await sendSmart({
    to: opts.to,
    lastInboundAt: opts.lastInboundAt,
    text,
    templateName: "ajapa_notify_guru",
    templateParams: [short],
  });
}

export async function notifyGuruAnswerReady(opts: {
  to: string;
  lastInboundAt: string | null;
  questionShort: string;
  answerText?: string | null;
}): Promise<void> {
  const text = opts.answerText
    ? `तुझ्या प्रश्नाचे उत्तर आले — अ‍ॅप किंवा WhatsApp वर पाहा.\n\nप्रश्न: ${opts.questionShort}\n\nउत्तर:\n${opts.answerText}`
    : `तुझ्या प्रश्नाचे उत्तर आले — अ‍ॅप किंवा WhatsApp वर पाहा.\n\nप्रश्न: ${opts.questionShort}`;
  await sendSmart({
    to: opts.to,
    lastInboundAt: opts.lastInboundAt,
    text,
    templateName: "ajapa_answer_ready",
    templateParams: [truncateParam(opts.questionShort, 120)],
  });
}

export async function fetchMediaUrl(mediaId: string): Promise<string | null> {
  const c = cfg();
  if (c.dryRun) return `https://example.invalid/media/${mediaId}`;
  if (!c.token) return null;
  const meta = await fetch(`${c.apiBase}/${mediaId}`, {
    headers: { Authorization: `Bearer ${c.token}` },
  });
  if (!meta.ok) return null;
  const data = (await meta.json()) as { url?: string };
  return data.url || null;
}
