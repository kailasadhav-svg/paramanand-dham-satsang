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

export const QUESTION_AI_FIRST_HELP =
  "प्रत्येक प्रश्नाला आधी परमानंद साहित्य (AI) उत्तर मिळते. समाधान नसेल तर मार्गदर्शक चरणसेवकांकडे पाठवा.";

/** One local conductor per place per Thursday (maps existing place_duties / संचालक). */
export const VAHAK_LABEL = "परमानंद विचार वाहक";
export const VAHAK_LABEL_SHORT = "विचार वाहक";

export const VAHAK_JOB_HELP =
  "या आठवड्याचे परमानंद विचार वाहक विषय दुरुस्त करतात, सर्वांचे चिंतन जमा करतात, पाठपुरावा करतात आणि लिहिण्यास मदत करतात. पूर्ण चिंतन फक्त मार्गदर्शक (मधुसुदनदास) पाहतात — इथे फक्त आले / बाकी दिसेल. विचार वाहक नेहमी परमानंद चरणसेवकांपैकी एक.";

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
