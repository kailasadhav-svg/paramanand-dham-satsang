# अजपा संवाद — Meta टेम्प्लेट कसे बनवायचे (Step by Step)

**तुम्ही स्वतः कराल** — Turiya Infotech / Meta वर.  
**WABA:** Team Dhyeyapurti · `917030111501`  
**Language:** Marathi (`mr`)  
**Category:** Utility (सर्व १०)  
**Footer:** `|| हरि ॐ परमानंद विश्वव्यापकम् ||`  
**मजकूर मसुदा:** [`AJAPA_WABA_TEMPLATES.md`](./AJAPA_WABA_TEMPLATES.md)

> ⚠️ सर यांचा चालू बॉट **अस्पर्श**. फक्त खालील **नवीन** टेम्प्लेट तयार करा. जुने डिलीट/एडिट करू नका.

---

## A) लॉगिन

1. फोन/कंप्यूटरवर उघडा: **https://app.turiyainfotech.com**
2. Username / Password ने लॉगिन करा (`dhyeya` …)
3. वर **Create Template** किंवा टेम्प्लेट यादी → हिरवे **`+`**

---

## B) प्रत्येक टेम्प्लेट — ४ पावले

Add Template फॉर्ममध्ये **Name → Body → Buttons** टॅब असतात.

### पाऊल १ — Name टॅब
| फील्ड | काय भरायचे |
|--------|------------|
| Waba Account | **Team Dhyeyapurti** |
| Template Name | खालील यादीतील `नाव` (इंग्रजी small letters + `_`) |
| Template Language | **Marathi** |
| Template Category | **Utility** |

### पाऊल २ — Body टॅब
1. [`AJAPA_WABA_TEMPLATES.md`](./AJAPA_WABA_TEMPLATES.md) मधून त्या टेम्प्लेटचा **मजकूर** कॉपी करा  
2. Body मध्ये पेस्ट करा  
3. `{{1}}`, `{{2}}` … जसे आहेत तसे ठेवा (मिटवू नका)  
4. Example / नमुना विचारले तर खालील “उदाहरण” वापरा  
5. Footer वेगळे फील्ड असेल तर: `|| हरि ॐ परमानंद विश्वव्यापकम् ||`  
   - नसेल तर body च्या शेवटी footer ओळ ठेवा

### पाऊल ३ — Buttons टॅब
1. **Quick Reply** बटणे जोडा (कमाल ३)  
2. मजकूर बरोबर कॉपी करा (२५ अक्षरांपेक्षा मोठे असल्यास UI नाकारेल — तेव्हा थोडक्यात करा)  
3. क्रम हाच ठेवा

### पाऊल ४ — Save / Submit
1. **Submit** / **Save** दाबा  
2. Status: **Pending** → Meta approve (१–२ दिवस) → **Approved**  
3. पुढचा टेम्प्लेट — पुन्हा **`+`**

---

## C) कोणते १० टेम्प्लेट? (क्रम)

आधी **१–६ अजपा** पूर्ण करा. नंतर सत्संग A–D.

| # | Template Name | बटणे (Quick Reply) | Body उदाहरण |
|---|---------------|---------------------|-------------|
| 1 | `ajapa_ai_answer` | मधुसुदनदासांकडे पाठवा · पुरे आहे · अ‍ॅप उघडा | {{1}}=राम · {{2}}=अजपा म्हणजे श्वासासोबत नामस्मरण |
| 2 | `ajapa_notify_guru` | उत्तर द्या · नंतर · अ‍ॅप पाहा | सीता · 9876543210 · प्रश्न · थोडक्यात AI |
| 3 | `ajapa_guru_reply_choice` | टाइप करा · व्हॉइस नोट · रद्द | {{1}}=9876543210 |
| 4 | `ajapa_answer_ready` | उत्तर पाहा · अ‍ॅप उघडा | {{1}}=राम |
| 5 | `ajapa_weekly_question` | उत्तर देईन · अ‍ॅप उघडा | {{1}}=अजपा जप कसा स्थिर ठेवावा? |
| 6 | `ajapa_welcome_code` | समजलं · अ‍ॅप उघडा | {{1}}=1960 |
| 6b | `ajapa_app_otp` | (नाही) | {{1}}=123456 — **OTP लॉगिनसाठी आवश्यक** |
| 7 | `satsang_wed_notice` | अ‍ॅप उघडा · समजलं | अजपा · श्वास आणि नाम |
| 8 | `satsang_thu_reminder` | उपस्थिती नोंदवा · अ‍ॅप उघडा | नाशिक · ८:०० · रामदास · अजपा |
| 9 | `satsang_weekly_report` | पूर्ण अहवाल · अ‍ॅप उघडा | तारीख · उपस्थिती · विषय · सार |
| 10 | `satsang_fill_reminder` | आता भरा · नंतर | {{1}}=सीता |

पूर्ण मजकूर → **[`AJAPA_WABA_TEMPLATES.md`](./AJAPA_WABA_TEMPLATES.md)**

---

## D) एक टेम्प्लेट — संपूर्ण उदाहरण (`ajapa_ai_answer`)

**Name**
- Name: `ajapa_ai_answer`
- Language: Marathi
- Category: Utility

**Body** (पेस्ट):
```
हरि ॐ परमानंद 🙏
{{1}} जी, तुमच्या प्रश्नाचे उत्तर:
{{2}}

|| हरि ॐ परमानंद विश्वव्यापकम् ||
```

**Buttons**
1. `मधुसुदनदासांकडे पाठवा`  
   - खूप लांब नाकारले तर: `गुरुंकडे पाठवा`
2. `पुरे आहे`
3. `अ‍ॅप उघडा`

Submit → पुढचा.

---

## E) तपासणी

1. Template List → Waba **Team Dhyeyapurti** → Search  
2. Status: Pending / Approved / Rejected  
3. Rejected → Meta कारण वाचा → मजकूर थोडा बदला → पुन्हा submit  
4. Approved झाल्यावर अ‍ॅप/बॉट मधून वापर सुरू

---

## F) महत्त्वाचे नियम

1. Template Name फक्त: `a-z`, `0-9`, `_` (मराठी नाव नको)  
2. Category: **Utility** (Marketing निवडू नका — या फ्लोसाठी)  
3. जुने OTP/मतदार टेम्प्लेट **हाथ न लावता**  
4. एकाच नावाने दोनदा create करू नका  
5. Approve येईपर्यंत टेस्ट टेम्प्लेट मेसेज बाहेर जाणार नाही (२४ तास विंडो आत session मेसेज चालू शकतात)

---

## G) अडचण आली तर

| समस्या | काय करा |
|--------|---------|
| बटण खूप लांब | २५ अक्षरांपेक्षा कमी करा |
| `{{1}}` error | Body मध्ये व्हेरिएबल क्रमांक सलग ठेवा |
| Category reject | Utility ठेवा; मजकूर जाहिरातसारखा करू नका |
| Login Invalid | Username/password तपासा |
| Create Template API सापडत नाही | UI `+` नेच तयार करा (ही पद्धत योग्य) |

---

**फाइल्स**
- Step-by-step: हा दस्तऐवज  
- कॉपी-पेस्ट मजकूर: [`AJAPA_WABA_TEMPLATES.md`](./AJAPA_WABA_TEMPLATES.md)  
- फ्लो लॉक: [`AJAPA_QA_FLOW.md`](./AJAPA_QA_FLOW.md)
