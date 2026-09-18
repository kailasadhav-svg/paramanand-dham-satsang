# परमानंद धाम सत्संग / Paramanand Dham Satsang

Marathi-first mobile web app to **record and report** Thursday satsang — not a WhatsApp bot.

WhatsApp remains the notice channel. This app stores:

1. **Attendance by place** (पुरुष / स्त्रिया / बालके)
2. **Topic** — आत्मप्रभा (Atmaprabha) or उपदेश (Upadesh) + conductor
3. **Q&A** — answers from आत्मप्रभा or मधुसुदनदास विजयानंद
4. **Weekly report** with WhatsApp-copyable Marathi text

Default satsang time: **Thursday 8:00 PM (IST)**.

## Roles

| Role | Marathi | Who |
| --- | --- | --- |
| Base member | परमानंद चरणसेवक | everyone |
| Attendance | सत्संग चरणसेवक | records Thursday satsang counts; Friday 06:00–12:00 IST may appoint विचार वाहक if none |
| Weekly conductor | परमानंद विचार वाहक | always one of परमानंद चरणसेवक; one per place per Thursday (`place_duties`) |
| Software | संगणक चरणसेवक | KAILAS · 9225118811 |
| Guide / super admin | मार्गदर्शक चरणसेवक | मधुसुदनदास · 9850120960 — topics, all चिंतन, approve app access, appoint Vahak |

विचार वाहक appointment cascade (one परमानंद चरणसेवक per place per Thursday):
1. मार्गदर्शक appoints (main weekly duty).
2. If still empty: सत्संग चरणसेवक on **that week’s Friday 06:00–12:00 noon IST**.
3. After Friday noon, if still empty: last Thursday’s वाहक continues automatically.

App login is a simple **प्रवेश पिन** (`ADMIN_PIN`, default `1960`). Web members start with **अजपा / ajpa** at `/register` (not नोंदणी). WhatsApp still uses locked `अजपा Q` / `अजपा A` (see below) — those command shapes are not merged yet.

Isolation (role-scoped screens/data do not leak):
- **संगणक** — GPS, अहवाल, attendance tools, login-code collisions. No all-seeker अजपा, no चिंतन roster/bodies, no weekly topic edit, no Vahak appoint.
- **मार्गदर्शक** — topics, all चिंतन text, approve app access, appoint विचार वाहक, all member questions.
- **परमानंद विचार वाहक** — own place topic + चिंतन status only (never bodies).
- **सत्संग चरणसेवक** — attendance counts; Friday 06:00–12:00 IST Vahak window if empty.

## मार्गदर्शक चरणसेवक powers (मधुसुदनदास)

Now in the app:
- All-seeker अजपा answers (`/ajapa`) and village प्रश्नोत्तर (`/questions`)
- Full चिंतन bodies (`/weekly`); per-place Thursday topic (`/topic`, `/weekly`)
- Approve app access; appoint विचार वाहक

## Weekly question + चिंतन rules

Now:
1. **One question per परमानंद चरणसेवक per week** (hard limit on `/api/questions` and WhatsApp `अजपा Q`). मार्गदर्शक unlimited.
2. **चिंतन is mandatory** for everyone (copy + empty submit rejected).
3. **Village चिंतन PDF** — `GET /api/weekly/chintan-pdf` returns a JSON stub grouped by village. TODO: real PDF.
4. **Every question gets an automatic AI / परमानंद साहित्य answer first.**
5. **If unsatisfied → escalate** to मार्गदर्शक (`मार्गदर्शकांकडे`, Meta WhatsApp OTP). One escalate to मधुसुदनदास per week already enforced.
6. **Question id** = village + year-week + FIFO sequence (computed on list; TODO persist). Week 1 = first Thursday of January 2026 (`2026-01-01`); later Thursdays +1 within the year.
7. **हस्तलिखित उत्तर photo** — मार्गदर्शक stub `POST /api/questions/[id]/handwritten`. TODO: store image.
8. **Thursday tithi bar** — Marathi panchang stub + week number at the top of Thursday screens. TODO: live panchang.
9. **Thursday 17:00 archive** — previous week’s per-village immutable चिंतन + प्रश्न-उत्तर files (`GET/POST /api/weekly/archive` stub). मार्गदर्शक owns; summary (type/photo/voice) mandatory before visible; previous विचार वाहक must read/play at the place. TODO: cron + persist + media.

Specified — copy is on मार्गदर्शक screens; tools not built yet:
1. **All member questions route to them.**
2. **Dashboard:** total questions + **एकसमान** (similar/duplicate) count; answer similars with **one shared answer** or per-person answers.
3. From submitted चिंतन: pick/rank **क्रमवार योग्य तीन**.
4. **Topic authority:** same topic for all villages **or** a different topic per village (per-village save exists; same-for-all bulk is upcoming).

## Seed places

1. श्री क्षेत्र रानअंत्री
2. वरखेड
3. बरटाळा
4. शिंदी
5. नाशिक

## Screens (bottom nav)

| Tab | Route | Use |
| --- | --- | --- |
| उपस्थिती | `/attendance` | Place + Thursday + counts |
| विषय | `/topic` | Atmaprabha / Upadesh, title, conductor |
| प्रश्न | `/questions` | Weekly satsang Q&A (manual) |
| संवाद | `/ajapa` | **अजपा संवाद** — WhatsApp Q→AI→guru · local-first PWA |
| अहवाल | `/report` | Per-place summary + copy/open WhatsApp |

Short aliases: `/a` `/t` `/q` `/j` `/r`.

## अजपा संवाद (PWA)

Home-screen app name: **अजपा संवाद**.  
Install → **Add to Home Screen**. List/search on phone (IndexedDB); server only for sync.  
See [`docs/LOCAL_FIRST_PWA.md`](docs/LOCAL_FIRST_PWA.md).

## Locked product: अजपा WhatsApp Q&A

See [`docs/AJAPA_QA_FLOW.md`](docs/AJAPA_QA_FLOW.md) (locked) and [`docs/AJAPA_WABA_TEMPLATES.md`](docs/AJAPA_WABA_TEMPLATES.md).

| Who | Command | Next |
| --- | --- | --- |
| चरणसेवक | `अजपा Q` + प्रश्न | AI ≥200 words → `1` escalate to मधुसुदनदास |
| मधुसुदनदास | `अजपा A` + mobile | show pending → `1` text / `2` voice → notify seeker |

Webhook: `POST/GET /api/whatsapp/webhook` · App list: `GET /api/ajapa/questions` · WABA `7030111501`.

```bash
npm run test:ajapa
```

## Out of scope (remaining)

- Native iOS/Android apps
- Production media hosting for voice (stores WhatsApp media id/URL; add R2/S3 for permanence)

## Run locally

```bash
npm install
cp .env.example .env.local   # optional; defaults work
npm run dev
```

Open **http://localhost:43123**

Production-style:

```bash
npm run build
npm start
```

(`start` also uses port **43123**.)

## Data & auth

- Local and preferred VPS production: SQLite file `data/satsang.db` via `@libsql/client` (created on first request; gitignored). On the single-server host (`satsang.dhyeyapurti.in`) set `ALLOW_FILE_STORE=1` so app and DB stay on the same disk.
- Turso (libSQL over HTTP) is only for multi-instance or Vercel. A SQLite file on Vercel serverless is ephemeral and must not be used for attendance / Q&A.
- Cookie session after PIN (`satsang_session`); member session is a separate cookie (`satsang_member`)
- Change PIN with env `ADMIN_PIN`
- Optional `SESSION_SECRET` for cookie HMAC
- On Vercel, login cookies are marked `Secure` automatically. Locally, keep `COOKIE_SECURE=false` unless you use HTTPS.

```
ADMIN_PIN=1960
SESSION_SECRET=change-me-in-production
COOKIE_SECURE=false
```

### VPS production (preferred)

On a single VPS with a persistent disk (nginx → Node, `satsang.dhyeyapurti.in`):

```
ALLOW_FILE_STORE=1
COOKIE_SECURE=true
ADMIN_PIN=…          # unique, not 1960
SESSION_SECRET=…     # long random
WHATSAPP_VERIFY_TOKEN=…
WHATSAPP_APP_SECRET=…
# Outbound OTP (संगणक 9225118811 / मार्गदर्शक 9850120960):
WHATSAPP_PROVIDER=meta          # or turiya
WHATSAPP_TOKEN=…                # Meta Graph (meta provider)
WHATSAPP_PHONE_NUMBER_ID=…
# TURIYA_API_KEY=…              # only if WHATSAPP_PROVIDER=turiya
WHATSAPP_DRY_RUN=0              # must be off on VPS — production ignores dry-run anyway
WHATSAPP_OTP_TEMPLATE=…         # exact approved Meta AUTHENTICATION OTP template name
WHATSAPP_OTP_AUTH=1             # body + copy-code button (Meta OTP format)
WHATSAPP_OTP_LANG=en            # match template language (en / en_US / mr)
```

SQLite lives at `data/satsang.db` next to the app. Do not use Turso unless you run multiple instances.

If Meta AUTHENTICATION OTP is already approved in Turiya/Meta, set `WHATSAPP_OTP_TEMPLATE` to that exact template name and keep `WHATSAPP_OTP_AUTH=1`. Utility fallback: `ajapa_welcome_code`. See `docs/AJAPA_WABA_TEMPLATES.md`.

`GET /api/health` returns `{ ok, db, secrets, whatsapp: { outbound_ok, provider, dry_run }, production_ready }` when the store is reachable.

### Vercel / multi-instance production

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (or `npx vercel --prod` while logged in).
2. Create a Turso database (free):

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   turso db create paramanand-dham-satsang
   turso db show paramanand-dham-satsang --url
   turso db tokens create paramanand-dham-satsang
   ```

3. In the Vercel project → **Settings → Environment Variables** (Production):

   | Name | Value |
   | --- | --- |
   | `ADMIN_PIN` | `1960` |
   | `SESSION_SECRET` | a long random string |
   | `COOKIE_SECURE` | `true` |
   | `TURSO_DATABASE_URL` | `libsql://…` from `turso db show --url` |
   | `TURSO_AUTH_TOKEN` | token from `turso db tokens create` |

4. Redeploy after saving env vars. On Vercel, allow phone browsers to open the URL without an extra login gate.
5. Short aliases on the production host: `/a` → attendance, `/t` → topic, `/q` → questions, `/j` → ajapa, `/r` → report.

`GET /api/health` returns `{ ok, db: { store: "turso" | "file" }, production_ready }`. File SQLite on Vercel is never production-ready.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- libSQL (`@libsql/client`) — local file or Turso

## License

Operational tool for परमानंद धाम satsang coordinators — not for redistribution.
