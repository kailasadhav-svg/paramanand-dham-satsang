import { normalizeMobile } from "./login-code.ts";
import { parsePlaceInput, type PlaceCode } from "./places.ts";

/** Easy start words. Members must not need to type नोंदणी. */
export const AJPA_MR = "अजपा";
export const AJPA_EN = "ajpa";
export const AJPA_LABEL = "अजपा · ajpa";

export type AjpaParse =
  | { kind: "none"; rest: string }
  | { kind: "keyword_only" }
  | { kind: "keyword_plus"; rest: string };

export type AjpaIntent =
  | { action: "none" }
  | { action: "start_register" }
  | { action: "weekly_prompt" }
  | { action: "weekly_answer"; answer: string };

export type RegisterChatStep = "ask_name" | "ask_mobile" | "ask_place" | "done";

export type RegisterDraft = {
  name?: string;
  mobile?: string;
  place_code?: PlaceCode;
};

/**
 * WhatsApp/bot parser (no webhook yet).
 * unknown + अजपा/ajpa only → start registration (name, mobile, place one by one)
 * registered + अजपा/ajpa + text → weekly ANS
 * नोंदणी is not a start word.
 */
export function parseAjpaMessage(raw: string): AjpaParse {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "none", rest: "" };
  const lower = text.toLowerCase();
  for (const word of [AJPA_MR, AJPA_EN] as const) {
    const hit = word === AJPA_MR ? text.startsWith(AJPA_MR) : lower.startsWith(AJPA_EN);
    if (!hit) continue;
    const after = text.slice(word.length);
    if (after && !/^[:\s,.\-]/.test(after)) continue;
    const rest = after.replace(/^[:\s,.\-]+/, "").trim();
    return rest ? { kind: "keyword_plus", rest } : { kind: "keyword_only" };
  }
  return { kind: "none", rest: text };
}

export function resolveAjpaIntent(raw: string, registered: boolean): AjpaIntent {
  const parsed = parseAjpaMessage(raw);
  if (parsed.kind === "none") return { action: "none" };
  if (!registered) return { action: "start_register" };
  if (parsed.kind === "keyword_plus") {
    return { action: "weekly_answer", answer: parsed.rest };
  }
  return { action: "weekly_prompt" };
}

export function registerPrompt(step: RegisterChatStep): string {
  if (step === "ask_name") return "नाव लिहा";
  if (step === "ask_mobile") return "मोबाइल (१० अंक) लिहा";
  if (step === "ask_place") return "स्थान: रानअंत्री / वरखेड / बरटाळा / अंबाशी / नाशिक";
  return AJPA_LABEL;
}

export function applyRegisterReply(
  step: RegisterChatStep,
  reply: string,
  draft: RegisterDraft = {},
): { step: RegisterChatStep; draft: RegisterDraft; error?: string; prompt: string } {
  const text = reply.trim();
  if (step === "ask_name") {
    const name = text.replace(/\s+/g, " ");
    if (name.length < 2) {
      return { step, draft, error: "नाव लिहा", prompt: registerPrompt("ask_name") };
    }
    const next = { ...draft, name };
    return { step: "ask_mobile", draft: next, prompt: registerPrompt("ask_mobile") };
  }
  if (step === "ask_mobile") {
    const mobile = normalizeMobile(text);
    if (!mobile) {
      return { step, draft, error: "१० अंकी मोबाइल लिहा", prompt: registerPrompt("ask_mobile") };
    }
    const next = { ...draft, mobile };
    return { step: "ask_place", draft: next, prompt: registerPrompt("ask_place") };
  }
  if (step === "ask_place") {
    const place_code = parsePlaceInput(text);
    if (!place_code) {
      return { step, draft, error: "स्थान निवडा", prompt: registerPrompt("ask_place") };
    }
    const next = { ...draft, place_code };
    return { step: "done", draft: next, prompt: AJPA_LABEL };
  }
  return { step: "done", draft, prompt: AJPA_LABEL };
}
