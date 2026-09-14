export type AjapaStatus = "ai_answered" | "escalated" | "guru_answered";

/** private = फक्त प्रश्नकर्ता + संचालक/संवादक; public = स्थळातील सर्वांना */
export type AjapaVisibility = "private" | "public";

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
  visibility: AjapaVisibility;
  guru_answer_text: string | null;
  guru_answer_audio_url: string | null;
  guru_answer_audio_media_id: string | null;
  /** सत्संग स्थळ — संवाद या विषयावर चालतो */
  place_id: number | null;
  place_name: string | null;
  meeting_date: string | null;
  topic_kind: "atmaprabha" | "upadesh" | null;
  topic_title: string | null;
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
