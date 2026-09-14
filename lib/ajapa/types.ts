export type AjapaStatus = "ai_answered" | "escalated" | "guru_answered";

export type AjapaSessionState =
  | "idle"
  | "awaiting_escalate_choice"
  | "guru_awaiting_mode"
  | "guru_awaiting_text"
  | "guru_awaiting_voice";

export type AjapaQuestion = {
  id: number;
  seeker_phone: string;
  seeker_name: string | null;
  question: string;
  ai_answer: string | null;
  status: AjapaStatus;
  guru_answer_text: string | null;
  guru_answer_audio_url: string | null;
  guru_answer_audio_media_id: string | null;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  answered_at: string | null;
};

export type WaSession = {
  phone: string;
  state: AjapaSessionState;
  ajapa_question_id: number | null;
  last_inbound_at: string;
  updated_at: string;
};

export type InboundWaMessage = {
  from: string;
  text?: string;
  audioMediaId?: string;
  profileName?: string;
};
