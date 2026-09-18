/**
 * Submit Ajapa + Satsang WhatsApp templates to Meta (via Graph API / Dove Soft Cloud).
 *
 * Required env:
 *   WHATSAPP_TOKEN          — permanent system user / BSP token
 *   WHATSAPP_WABA_ID        — WhatsApp Business Account ID (NOT the phone 7030111501)
 * Optional:
 *   WHATSAPP_GRAPH_VERSION  — default v21.0
 *   WHATSAPP_API_BASE       — default https://graph.facebook.com
 *   SUBMIT_DRY_RUN=1        — print payloads only
 *
 * Usage:
 *   SUBMIT_DRY_RUN=1 npx tsx scripts/submit-waba-templates.ts
 *   WHATSAPP_TOKEN=... WHATSAPP_WABA_ID=... npx tsx scripts/submit-waba-templates.ts
 */

const FOOTER = "|| हरि ॐ परमानंद विश्वव्यापकम् ||";

type QuickReply = { type: "QUICK_REPLY"; text: string };

type TemplateDef = {
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  body: string;
  bodyExamples: string[][];
  buttons?: QuickReply[];
};

function bodyComponent(text: string, examples: string[][]) {
  const hasVars = /\{\{\d+\}\}/.test(text);
  return {
    type: "BODY",
    text,
    ...(hasVars ? { example: { body_text: examples } } : {}),
  };
}

function buttonsComponent(buttons: QuickReply[]) {
  return {
    type: "BUTTONS",
    buttons: buttons.map((b) => ({ type: "QUICK_REPLY", text: b.text })),
  };
}

function footerComponent() {
  return { type: "FOOTER", text: FOOTER };
}

export const TEMPLATES: TemplateDef[] = [
  {
    name: "ajapa_ai_answer",
    category: "UTILITY",
    language: "mr",
    body: "हरि ॐ परमानंद 🙏\n{{1}} जी, तुमच्या प्रश्नाचे उत्तर:\n{{2}}",
    bodyExamples: [["राम", "अजपा म्हणजे श्वासासोबत नामस्मरण. (सारांश)"]],
    buttons: [
      { type: "QUICK_REPLY", text: "मधुसुदनदासांकडे पाठवा" },
      { type: "QUICK_REPLY", text: "पुरे आहे" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "ajapa_notify_guru",
    category: "UTILITY",
    language: "mr",
    body: "नवीन प्रश्न — {{1}} ({{2}})\nप्रश्न: {{3}}\nAI उत्तर थोडक्यात: {{4}}",
    bodyExamples: [["सीता", "9876543210", "अजपा जप कसा करावा?", "श्वासासोबत नामस्मरण सुरू ठेवा."]],
    buttons: [
      { type: "QUICK_REPLY", text: "उत्तर द्या" },
      { type: "QUICK_REPLY", text: "नंतर" },
      { type: "QUICK_REPLY", text: "अ‍ॅप पाहा" },
    ],
  },
  {
    name: "ajapa_guru_reply_choice",
    category: "UTILITY",
    language: "mr",
    body: "चरणसेवक {{1}} — उत्तर कसे द्याल?",
    bodyExamples: [["9876543210"]],
    buttons: [
      { type: "QUICK_REPLY", text: "टाइप करा" },
      { type: "QUICK_REPLY", text: "व्हॉइस नोट" },
      { type: "QUICK_REPLY", text: "रद्द" },
    ],
  },
  {
    name: "ajapa_answer_ready",
    category: "UTILITY",
    language: "mr",
    body: "{{1}} जी, मधुसुदनदास विजयानंद यांचे उत्तर आले. अ‍ॅप किंवा येथे पाहा.",
    bodyExamples: [["राम"]],
    buttons: [
      { type: "QUICK_REPLY", text: "उत्तर पाहा" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "ajapa_weekly_question",
    category: "UTILITY",
    language: "mr",
    body: "या आठवड्याचा प्रश्न: {{1}}\nउत्तर: अजपा + तुमचं उत्तर",
    bodyExamples: [["अजपा जप कसा स्थिर ठेवावा?"]],
    buttons: [
      { type: "QUICK_REPLY", text: "उत्तर देईन" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "ajapa_welcome_code",
    category: "UTILITY",
    language: "mr",
    body: "नोंद झाली. लॉगिन कोड: {{1}}\nप्रश्न: अजपा Q …",
    bodyExamples: [["1960"]],
    buttons: [
      { type: "QUICK_REPLY", text: "समजलं" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "satsang_wed_notice",
    category: "UTILITY",
    language: "mr",
    body: "हरि ॐ परमानंद 🙏\nउद्या गुरुवार रात्री ८ वाजता सत्संग.\n\nविषय: *{{1}}*\nचर्चा: *{{2}}*\nठिकाणे: रानअंत्री · वरखेड · बरटाळा · शिंदी · नाशिक",
    bodyExamples: [["अजपा", "श्वास आणि नाम"]],
    buttons: [
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
      { type: "QUICK_REPLY", text: "समजलं" },
    ],
  },
  {
    name: "satsang_thu_reminder",
    category: "UTILITY",
    language: "mr",
    body: "हरि ॐ परमानंद 🙏\nआज रात्री ८ वाजता सत्संग.\n\nठिकाण/वेळ: *{{1}}*\nसंचालन: *{{2}}*\nविषय: *{{3}}*\n\nसत्संगानंतर अ‍ॅपमध्ये नोंद करा.",
    bodyExamples: [["नाशिक · ८:००", "रामदास", "अजपा"]],
    buttons: [
      { type: "QUICK_REPLY", text: "उपस्थिती नोंदवा" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "satsang_weekly_report",
    category: "UTILITY",
    language: "mr",
    body: "हरि ॐ परमानंद 🙏\nसत्संग अहवाल — *{{1}}*\n\nठिकाणानुसार उपस्थिती: *{{2}}*\nविषय: *{{3}}*\nप्रश्न/उत्तर सार: *{{4}}*",
    bodyExamples: [
      ["१२-०९-२०२६", "नाशिक ४० · वरखेड २५", "अजपा", "३ प्रश्न / २ उत्तरे"],
    ],
    buttons: [
      { type: "QUICK_REPLY", text: "पूर्ण अहवाल" },
      { type: "QUICK_REPLY", text: "अ‍ॅप उघडा" },
    ],
  },
  {
    name: "satsang_fill_reminder",
    category: "UTILITY",
    language: "mr",
    body: "हरि ॐ परमानंद 🙏\n*{{1}}* जी, आजच्या सत्संगाची उपस्थिती · विषय · प्रश्न अ‍ॅपमध्ये भरा.",
    bodyExamples: [["सीता"]],
    buttons: [
      { type: "QUICK_REPLY", text: "आता भरा" },
      { type: "QUICK_REPLY", text: "नंतर" },
    ],
  },
];

function toPayload(t: TemplateDef) {
  const components: Record<string, unknown>[] = [
    bodyComponent(t.body, t.bodyExamples),
    footerComponent(),
  ];
  if (t.buttons?.length) components.push(buttonsComponent(t.buttons));
  return {
    name: t.name,
    language: t.language,
    category: t.category,
    allow_category_change: true,
    components,
  };
}

async function submitOne(
  base: string,
  wabaId: string,
  token: string,
  payload: ReturnType<typeof toPayload>,
  dryRun: boolean,
) {
  if (dryRun) {
    console.log(`\n--- DRY ${payload.name} ---`);
    console.log(JSON.stringify(payload, null, 2));
    return { name: payload.name, ok: true, dryRun: true };
  }
  const url = `${base}/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    console.error(`FAIL ${payload.name}`, res.status, text.slice(0, 500));
    return { name: payload.name, ok: false, status: res.status, body: json };
  }
  console.log(`OK ${payload.name}`, JSON.stringify(json));
  return { name: payload.name, ok: true, body: json };
}

async function main() {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const wabaId = process.env.WHATSAPP_WABA_ID || "";
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
  const base = (process.env.WHATSAPP_API_BASE || `https://graph.facebook.com/${version}`).replace(
    /\/$/,
    "",
  );
  const dryRun =
    process.env.SUBMIT_DRY_RUN === "1" ||
    process.env.SUBMIT_DRY_RUN === "true" ||
    !token ||
    !wabaId;

  if (!token || !wabaId) {
    console.warn(
      "Missing WHATSAPP_TOKEN and/or WHATSAPP_WABA_ID — running DRY_RUN (payloads only).",
    );
    console.warn(
      "Note: WABA_ID is Meta account id, not the display phone 7030111501.",
    );
  }

  const results = [];
  for (const t of TEMPLATES) {
    results.push(await submitOne(base, wabaId, token, toPayload(t), dryRun));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nDone: ${results.length - failed.length}/${results.length} ok`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
