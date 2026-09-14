# अजपा संवाद — लोकल-फर्स्ट PWA

**नाव:** अजपा संवाद  
**Status:** Implemented — PWA + IndexedDB + role views  
**Install:** Add to Home Screen (Android Chrome / iOS Safari Share → Add to Home Screen)

```
अजपा संवाद (PWA)
        │
   IndexedDB + localStorage   ← शोध / यादी (सर्व्हर नाही)
        │
   सिंक फक्त नवीन Q / उत्तर
        │
     Server (Turso/SQLite)
```

## नियम
1. UI शोध/यादी → लोकल  
2. सर्व्हर → फक्त सिंक (`GET /api/ajapa/questions?since=…`)  
3. चरणसेवक → फक्त स्वतःचा `seeker_phone`  
4. गुरु फोन (`NEXT_PUBLIC_GURU_PHONE` / `GURU_PHONE`) → escalated + guru_answered  
5. WhatsApp बॉट फ्लो (`docs/AJAPA_QA_FLOW.md`) अस्पर्श  
6. भविष्यात: लाइव्ह / व्हॉइस-व्हिडिओ — नंतर

## फाइल्स
- `public/manifest.webmanifest` (नाव: अजपा संवाद), `public/sw.js`, `public/icons/*`
- `lib/offline/*` — profile, idb, sync
- `app/(app)/ajapa/page.tsx` — लोकल-फर्स्ट UI
- `components/InstallBanner.tsx`, `PwaRegister.tsx`
