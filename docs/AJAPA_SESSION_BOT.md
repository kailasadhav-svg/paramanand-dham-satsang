# अजपा / सोऽहं WhatsApp बॉट — Session-first (Meta approve कमी)

**तत्त्व:** यूजरने `अजपा` / `SOHAM` लिहिल्यानंतर **२४ तास session** उघडते.  
त्या वेळेत सर्व उत्तरे **साधे text / बटणे** — **Meta template approve नको**.

टेम्प्लेट फक्त तेव्हा हवे जेव्हा **आपण बाहेरून** (२४ तास बंद) मेसेज पाठवतो.

---

## १) बॉट कसा सुरू होतो

फक्त हे keywords (इतर चॅट अस्पर्श):

| Keyword |
|---------|
| `अजपा` · `अजापा` |
| `ajapa` · `Ajapa` · `AJAPA` · `ajpa` |
| `SOHAM` · `Soham` · `soham` |
| `सोहं` · `सोऽहं` · `सोहम्` |

**फक्त keyword** → सुंदर मेनू + बटणे (प्रश्न / अ‍ॅप / मदत)

---

## २) कमांड

| कोण | लिहा | काय होते |
|-----|------|----------|
| चरणसेवक | `अजपा Q` प्रश्न **किंवा** `SOHAM Q` प्रश्न | AI उत्तर (२००–४५० शब्द) + एस्केलेट बटणे |
| चरणसेवक | मेनू → प्रश्न विचारा → फक्त प्रश्न | तेच |
| चरणसेवक | `1` / बटण | मधुसुदनदासांकडे पाठवा |
| गुरु | `अजपा A` मोबाइल **किंवा** `SOHAM A` मोबाइल | प्रश्न दाखवा → टाइप/व्हॉइस |
| गुरु | `1` टाइप · `2` व्हॉइस | उत्तर सेव्ह + सेवकाला सूचना |

---

## ३) टेम्प्लेट — फक्त बाह्य मेसेज (२४ तास बाहेर)

| # | नाव | कधी आवश्यक |
|---|-----|------------|
| 1 | `ajapa_answer_ready` | गुरुने उत्तर दिले, पण सेवकाने २४ तासांत मेसेज केला नाही |
| 2 | `ajapa_notify_guru` | सेवकाने एस्केलेट केले, गुरु session बाहेर |
| 3 | `ajapa_weekly_question` | *(optional)* साप्ताहिक push |
| 4 | `ajapa_welcome_code` | *(optional)* bulk नोंद / OTP |

**नको (session मध्ये चालते):**
- AI पूर्ण उत्तर
- एस्केलेट बटणे
- गुरु mode बटणे
- Welcome मेनू

सत्संग reminder (`satsang_*`) — वेगळे broadcast; अजपा बॉटसाठी आवश्यक नाही.

---

## ४) कोड

| फाइल | भूमिका |
|------|--------|
| `lib/ajapa/keywords.ts` | keyword gate + welcome |
| `lib/ajapa/bot.ts` | state machine |
| `lib/ajapa/whatsapp.ts` | session-first send; template फक्त fallback |
| `docs/META_AI_ANSWER_LIMITS.md` | २००–४५० शब्द / ≤४००० अक्षरे |

Smoke: `WHATSAPP_DRY_RUN=1 npx tsx scripts/ajapa-smoke.ts`

---

## ५) आता काय करावे

1. Webhook URL Meta/Turiya वर दाखवा → `/api/whatsapp/webhook`  
2. फोनवर `SOHAM` किंवा `अजपा` पाठवा → मेनू येईल  
3. टेम्प्लेट: फक्त वरच्या **१–२** (उत्तर आले / गुरु notify) Meta ला पुन्हा छोट्या Utility मजकुरासह  
4. बाकी reject झालेले सत्संग template — आत्ता ignore; session/bot पुरेसे
