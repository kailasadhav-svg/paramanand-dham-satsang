export const TOPIC_LABEL: Record<string, string> = {
  atmaprabha: "आत्मप्रभा",
  upadesh: "उपदेश",
};

export const ANSWERED_BY_LABEL: Record<string, string> = {
  atmaprabha: "आत्मप्रभा",
  madhusudandas: "मधुसुदनदास विजयानंद",
};

/** Member response to the Thursday village topic — never टिपणी / comment / note. */
export const CHINTAN_LABEL = "चिंतन";
export const CHINTAN_WRITE_PLACEHOLDER = "चिंतन लिहा…";

export const TOPIC_THURSDAY_HELP =
  "मार्गदर्शक (मधुसुदनदास) गुरुवारी विषय देतात — सर्व गावांना एकच, किंवा गावानुसार वेगळा. अनिवार्य.";

/** मार्गदर्शक: topic authority. Per-village save exists; same-for-all bulk is upcoming. */
export const GUIDE_TOPIC_HELP =
  "विषय अधिकार: एकच विषय सर्व गावांना, किंवा प्रत्येक गावाला वेगळा. आत्ता गावानुसार जतन होते.";

/** मार्गदर्शक: rank top 3 चिंतन — UI not built yet. */
export const GUIDE_CHINTAN_RANK_HELP =
  "आलेल्या चिंतनातून क्रमवार योग्य तीन निवडता येतील — लवकरच. पूर्ण मजकूर फक्त मार्गदर्शक पाहतात.";

/** मार्गदर्शक: all questions + similar dashboard — inbox exists; एकसमान tools upcoming. */
export const GUIDE_QUESTION_HELP =
  "सर्व परमानंद चरणसेवकांचे प्रश्न मार्गदर्शक चरणसेवकांकडे येतात. डॅशबोर्ड: एकूण + एकसमान. एकसमानांना एकच उत्तर किंवा प्रत्येकास वेगळे — लवकरच.";

export const CHINTAN_DEADLINE_HELP =
  "चिंतन सर्वांसाठी अनिवार्य. परमानंद चरणसेवकांनी पुढील बुधवार रात्री १२:०० पर्यंत चिंतन पाठवावे. चिंतन नसल्यास दररोज आठवण येईल.";

export const CHINTAN_MISSING_REMINDER =
  "चिंतन अनिवार्य आहे आणि बाकी आहे. बुधवार रात्री १२:०० पर्यंत पाठवा. दररोज आठवण येईल.";

export const ONE_QUESTION_HELP =
  "एका आठवड्यात एका परमानंद चरणसेवकाकडून फक्त एकच प्रश्न.";

/** Member-facing name for literature-grounded retrieval answers. Never say AI. */
export const LITERATURE_ANSWER_LABEL = "परमानंद साहित्य उत्तर";
export const LITERATURE_ANSWERS_LABEL = "परमानंद साहित्य उत्तरे";

export const QUESTION_AI_FIRST_HELP =
  "प्रत्येक प्रश्नाला आधी परमानंद साहित्य उत्तर मिळते. समाधान नसेल तर मार्गदर्शक चरणसेवकांकडे पाठवा.";

/** Public question id = village + year-week + FIFO sequence. */
export const QUESTION_ID_HELP =
  "प्रश्न क्रमांक: गाव + आठवडा + क्रम (FIFO). आठवडा १ = जानेवारी २०२६ चा पहिला गुरुवार (२०२६-०१-०१).";

/** मार्गदर्शक: photo of handwritten answer — storage TODO. */
export const HANDWRITTEN_PHOTO_HELP =
  "मार्गदर्शक प्रत्येक प्रश्नाचे हस्तलिखित उत्तर छायाचित्र अपलोड करू शकतात — लवकरच.";

/** Thursday screens: Marathi panchang tithi in the top area. */
export const PANCHANG_TITHI_HELP =
  "गुरुवार पडद्याच्या वर मराठी पंचांग तिथि. आत्ता stub — खरा पंचांग नंतर.";

/** Thursday 17:00 previous-week archive. */
export const WEEKLY_ARCHIVE_HELP =
  "प्रत्येक गुरुवारी सायंकाळी ५ वाजता मागच्या आठवड्याच्या गावानुसार चिंतन व प्रश्न-उत्तर फाइल्स तयार होतात. मालकी मधुसुदनदास. तयार झाल्यावर बदल नाहीत.";

export const WEEKLY_ARCHIVE_SUMMARY_HELP =
  "मार्गदर्शक चिंतन फाइलवर सारांश अनिवार्य: टाइप किंवा छायाचित्र किंवा व्हॉइस. दिसणारे केल्यास त्या गुरुवाराचे विचार वाहक वाचतात/ऐकतात — स्थळी वाचणे/वाजवणे अनिवार्य.";

export const WEEKLY_ARCHIVE_VAHAK_HELP =
  "मागच्या आठवड्याचे विचार वाहक दिसणारा सारांश स्थळी वाचावा किंवा वाजवावा. गाव प्रशासकांना सत्संगात दाखवणे ऐच्छिक.";

/** One local conductor per place per Thursday (maps existing place_duties / संचालक). */
export const VAHAK_LABEL = "परमानंद विचार वाहक";
export const VAHAK_LABEL_SHORT = "विचार वाहक";

/** Village topic create/edit — मार्गदर्शक only. Never Vahak or संगणक. */
export const TOPIC_EDIT_GUIDE_ONLY_HELP = "विषय तयार / दुरुस्ती फक्त मार्गदर्शक.";

/** Own sentence so it cannot be skimmed as «विचार वाहक विषय दुरुस्त करतात». */
export const VAHAK_NO_TOPIC_EDIT_HELP =
  "विषय तयार/दुरुस्ती विचार वाहकांचे काम नाही — फक्त मार्गदर्शक.";

export const VAHAK_JOB_HELP =
  "या आठवड्याचे परमानंद विचार वाहक सर्वांचे चिंतन जमा करतात, पाठपुरावा करतात आणि लिहिण्यास मदत करतात. स्थिती: आले / बाकी. पूर्ण चिंतन फक्त मार्गदर्शक (मधुसुदनदास) पाहतात. विचार वाहक नेहमी परमानंद चरणसेवकांपैकी एक.";

export const GUIDE_LABEL = "मार्गदर्शक चरणसेवक";
export const GUIDE_LABEL_SHORT = "मार्गदर्शक";
export const SOFTWARE_LABEL = "संगणक चरणसेवक";
export const SOFTWARE_LABEL_SHORT = "संगणक";
export const SATSANG_CHARANSEVAK_LABEL = "सत्संग चरणसेवक";
export const MEMBER_ROLE_LABEL = "परमानंद चरणसेवक";

/** Ajapa escalate queue — WhatsApp interactive title must stay ≤20 chars. */
export const GUIDE_QUEUE_LABEL = "मार्गदर्शकांकडे";
export const GUIDE_ANSWER_LABEL = "मार्गदर्शक उत्तर";

export const VAHAK_APPOINT_HELP =
  "मार्गदर्शक प्रत्येक गुरुवारी विचार वाहक नेमतात. नसेल तर त्या सत्संगाच्या शुक्रवारी सकाळी ६–१२ वाजता सत्संग चरणसेवक नेमू शकतात. शुक्रवार दुपारी १२ नंतरही रिकामे असेल तर मागच्या सत्संगाचा विचार वाहक चालू राहतो. विचार वाहक नेहमी परमानंद चरणसेवकांपैकी एक.";

export const VAHAK_APPOINT_UNSET = "नेमलेले नाही";

/** Compact one-line label for a place’s appointed विचार वाहक. */
export function vahakDutyPersonLabel(
  duty: { charansevak_name: string | null; charansevak_phone_display: string } | null,
): string {
  if (!duty) return VAHAK_APPOINT_UNSET;
  const name = duty.charansevak_name?.trim();
  const phone = duty.charansevak_phone_display?.trim();
  if (name && phone) return `${name} · ${phone}`;
  return name || phone || VAHAK_APPOINT_UNSET;
}
