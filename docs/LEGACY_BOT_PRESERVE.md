# जुना Team Dhyeyapurti बॉट — अस्पर्श / बंद होणार नाही

स्क्रीनमधील **SIR मतदार साहाय्य सेवा** (`hi` → 1–9 मेनू) चालूच राहील.

## नियम

| मेसेज | कोण हाताळतो |
|--------|-------------|
| `hi`, `1`…`9`, मतदार फ्लो | **जुना बॉट** (Team Dhyeyapurti) |
| `अजपा` / `SOHAM` / `अजपा Q` … | **नवीन अजपा बॉट** |

## कसे काम करते

1. Meta webhook → आमचा अ‍ॅप (`/api/whatsapp/webhook`)
2. अजपा keyword / सक्रिय अजपा session? → आम्ही उत्तर देतो
3. नाही (`hi`, `1`–`9`, …)? → **जुन्या webhook URL कडे forward**

## सेटअप (एकदा)

1. Meta / Turiya मध्ये **आत्ताचा** webhook URL कॉपी करा (जुना बॉट).
2. VPS `.env.local` मध्ये:

```bash
LEGACY_WHATSAPP_WEBHOOK_URL=https://PASTE-OLD-BOT-WEBHOOK-HERE
```

3. Meta webhook **नवा** URL करा:

```text
https://satsang.dhyeyapurti.in/api/whatsapp/webhook
```

Verify token जुन्यासारखाच ठेवा (किंवा `WHATSAPP_VERIFY_TOKEN`).

4. टेस्ट:
- `hi` → जुना मतदार मेनू
- `SOHAM` / `अजपा` → नवीन अजपा मेनू

## कोड

- `lib/ajapa/bot.ts` — keyword/session शिवाय `handled: false`
- `lib/ajapa/legacy-forward.ts` — forward
- `app/api/whatsapp/webhook/route.ts` — unhandled → legacy
