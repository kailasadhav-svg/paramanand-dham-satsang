# अजपा प्रश्नोत्तर फ्लो (LOCKED)

**Status:** Locked — 2026-09-13 (KAILAS / cloud agent confirm: `Ho`)  
**WABA:** `7030111501` (Dove Soft / Meta Business Manager)  
**सर-बॉट:** या नंबरवरील विद्यमान बॉट **अस्पर्श**. अजपा फक्त `अजपा` / `ajapa`.  
**Footer:** `|| हरि ॐ परमानंद विश्वव्यापकम् ||`  
**टेम्प्लेट submit:** फक्त स्पष्ट `submit हो` — ऑटो-submit नाही.

हा दस्तऐवज WhatsApp बॉट + अ‍ॅप सिंकसाठी अंतिम सोपा फ्लो आहे. बदलण्यापूर्वी नवीन लॉक हवे.

---

## 1. चरणसेवक

1. लिही: `अजपा Q` आणि मग प्रश्न  
2. बॉट → पुस्तके/माहितीवरून **किमान २०० शब्दात** उत्तर (AI)  
3. बॉट विचारेल: *मधुसुदनदास विजयानंद यांच्याकडून उत्तर हवे असेल तर `1` दाबा*  
4. `1` → प्रश्न + AI उत्तर मधुसुदनदासांकडे (WhatsApp सूचना + अ‍ॅप अपडेट)

### लॉक केलेले डिफॉल्ट्स

| मुद्दा | निर्णय |
|--------|--------|
| एक मोबाइल = अनेक प्रलंबित प्रश्न | `अजपा A` नंतर **सर्वात अलीकडचा प्रलंबित** प्रश्न दाखवा (सोपा फ्लो). यादी नंतर हवी असल्यास वेगळे लॉक. |
| AI उत्तर | चरणसेवकाला लगेच; `1` नंतर गुरुंना प्रश्न **आणि** AI उत्तर दोन्ही पाठवा / अ‍ॅपमध्ये जतन |

---

## 2. मधुसुदनदास उत्तर कसे देतील

1. लिही: `अजपा A` आणि **चरणसेवकाचा मोबाइल**  
2. बॉट तो प्रश्न दाखवेल / आठवेल (वरचा डिफॉल्ट: अलीकडचा प्रलंबित)  
3. विचारेल:  
   - `1` = टाइप करून उत्तर  
   - `2` = व्हॉइस नोट  
4. जे देतील तसे **सेव्ह** → अ‍ॅप अपडेट  
5. चरणसेवकाला WhatsApp/अ‍ॅप: *तुझ्या प्रश्नाचे उत्तर आले — अ‍ॅप किंवा WhatsApp वर पाहा*

### व्हॉइस

- WhatsApp वर व्हॉइस नोट पाठवा **आणि** अ‍ॅपमध्ये ऑडिओ फाईल/URL सेव्ह करा (दोन्ही).

---

## 3. Meta टेम्प्लेट (२४ तास बाहेर अनिवार्य)

चॅट २४ तास उघडी असेल तर फ्री-फॉर्म चालते; टेम्प्लेट नंतरही Dove Soft / Meta BM मध्ये ठेवा → Approved झाल्यावरच बाह्य विंडो.

| # | टेम्प्लेट नाव | कधी |
|---|--------------|-----|
| 1 | `ajapa_ai_answer` | AI उत्तर चरणसेवकाला |
| 2 | `ajapa_ask_madhusudan` *(optional; escalate often on `ajapa_ai_answer` buttons)* | “१ / बटण” पर्याय |
| 3 | `ajapa_notify_guru` | मधुसुदनदासांना नवीन प्रश्न |
| 4 | `ajapa_answer_ready` *(alias `ajapa_guru_answer_ready`)* | चरणसेवकाला: उत्तर आले |
| 5 | `ajapa_weekly_question` | साप्ताहिक प्रश्न (ANS/अजपा) |
| 6 | `ajapa_welcome_code` *(alias `ajapa_login_code`)* | नोंद/कोड (bulk अपलोड नंतर) |

बटण मसुदा (Quick Reply): [`AJAPA_WABA_TEMPLATES.md`](./AJAPA_WABA_TEMPLATES.md) — **Meta submit फक्त `submit हो` नंतर.**

---

## 4. अंमलबजावणी स्थिती (implemented)

| आयटम | स्थिती |
|------|--------|
| WhatsApp webhook `GET/POST /api/whatsapp/webhook` | ✅ |
| State machine `अजपा Q` / `1` / `अजपा A` / `1`|`2` | ✅ `lib/ajapa/bot.ts` |
| DB `ajapa_questions` + `wa_sessions` | ✅ |
| AI ≥200 शब्द (knowledge / optional OpenAI) | ✅ |
| Templates + 24h session send | ✅ `lib/ajapa/whatsapp.ts` |
| अ‍ॅप UI `/ajapa` + API | ✅ |
| Meta submit copy | ✅ `docs/AJAPA_WABA_TEMPLATES.md` |
| Voice permanence (S3/R2) | ⏳ stores media id/URL only |

गुरु फोन default: `9850120960` (`GURU_PHONE`). Smoke: `WHATSAPP_DRY_RUN=1 npx tsx scripts/ajapa-smoke.ts`.
