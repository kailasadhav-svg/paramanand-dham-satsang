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
| Attendance | सत्संग चरणसेवक | records Thursday satsang counts; one per place per Thursday (`place_duties.duty_kind=satsang_charansevak`); Friday 06:00–12:00 IST may appoint विचार वाहक if none |
| Weekly conductor | परमानंद विचार वाहक | always one of परमानंद चरणसेवक; one per place per Thursday (`place_duties.duty_kind=vahak`) |
| Software | संगणक चरणसेवक | KAILAS · 9225118811 |
| Guide / super admin | मार्गदर्शक चरणसेवक | मधुसुदनदास · 9850120960 — **home `/weekly` (चिंतन)**. Topics, all चिंतन, Q&A answers, appoint Vahak **and** सत्संग चरणसेवक. Does **not** primarily record attendance. |

सत्संग चरणसेवक appointment (attendance duty — **not** the same row as विचार वाहक):
1. मार्गदर्शक appoints from a **separate dropdown** on `/attendance` (Vahak form stays as-is).
2. Previous Thursday’s सत्संग चरणसेवक may fill an empty slot.
3. संगणक does not appoint.
4. No auto-continue of last week’s सत्संग चरणसेवक (only explicit fill).

विचार वाहक appointment cascade (one परमानंद चरणसेवक per place per Thursday):
1. मार्गदर्शक appoints (main weekly duty).
2. If still empty: सत्संग चरणसेवक on **that week’s Friday 06:00–12:00 noon IST**.
3. After Friday noon, if still empty: last Thursday’s वाहक continues automatically.

App login is a simple **प्रवेश पिन** (`ADMIN_PIN`, default `1960`). Web members start with **अजपा / ajpa** at `/register` (not नोंदणी). WhatsApp still uses locked `अजपा Q` / `अजपा A` (see below) — those command shapes are not merged yet.

Isolation (role-scoped screens/data do not leak):
- **संगणक** — GPS, अहवाल, attendance tools, login-code collisions. No all-seeker अजपा, no चिंतन roster/bodies, no weekly topic edit, no Vahak or सत्संग चरणसेवक appoint.
- **मार्गदर्शक** — home `/weekly`. Topics, all चिंतन text, approve app access, appoint विचार वाहक **and** सत्संग चरणसेवक (two dropdowns). Attendance recording is सत्संग चरणसेवक work.
- **परमानंद विचार वाहक** — चिंतन collect / follow-up / help; आले vs बाकी names only (never चिंतन text). Never create/edit विषय — मार्गदर्शक only.
- **सत्संग चरणसेवक** — attendance counts; Friday 06:00–12:00 IST Vahak window if empty.

## मार्गदर्शक चरणसेवक powers (मधुसुदनदास)

Now in the app:
- All-seeker अजपा answers (`/ajapa`) and village प्रश्नोत्तर (`/questions`)
- Full चिंतन bodies (`/weekly`); per-place Thursday topic (`/topic`, `/weekly`)
- Approve app access; appoint विचार वाहक **and** सत्संग चरणसेवक (separate `place_duties` rows)

## Weekly question + चिंतन rules

Now:
1. **One question per परमानंद चरणसेवक per week** (hard limit on `/api/questions` and WhatsApp `अजपा Q`). मार्गदर्शक unlimited.
2. **चिंतन is mandatory** for everyone (copy + empty submit rejected). First submitted चिंतन from a गाव that Thursday week **locks that place’s विषय** (`topic_kind` / `topic_title` on `meetings`) — even मार्गदर्शक cannot edit. The **next** Thursday’s new per-place विषय is allowed only after that गाव’s prior-week **सारांश** (typed / photo upload / voice) on the archive stub. The shared `weekly_questions` row stays separate.
3. **Village चिंतन PDF** — `GET /api/weekly/chintan-pdf` returns a JSON stub grouped by village. TODO: real PDF.
4. **Every question gets an automatic परमानंद साहित्य उत्तर first** (literature-grounded retrieval).
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
| विषय | `/topic` | Thursday विषय (create/edit **मार्गदर्शक only**, then **read-only** after that गाव’s first चिंतन); विचार वाहक name; चिंतन follow-up status |
| चिंतन | `/weekly` | मार्गदर्शक only — replaces प्रश्न in their bottom nav |
| प्रश्न | `/questions` | Weekly satsang Q&A (manual); hidden for मार्गदर्शक (they do not ask) |
| संवाद | `/ajapa` | **अजपा संवाद** — WhatsApp Q→साहित्य उत्तर→guru · local-first PWA |
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
| चरणसेवक | `अजपा Q` + प्रश्न | परमानंद साहित्य उत्तर ≥200 words → `1` escalate to मधुसुदनदास |
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

### `place_duties` migration (VPS)

Live rows today store `charansevak_name` / `charansevak_phone` with `UNIQUE(place_id, meeting_date)`. The attendance UI already labels that duty **परमानंद विचार वाहक**. This deploy does **not** rename those rows.

On first request, `ensurePlaceDutiesDutyKind`:
1. Rebuilds `place_duties` adding `duty_kind`.
2. Copies every existing row as `duty_kind='vahak'`.
3. Changes uniqueness to `UNIQUE(place_id, meeting_date, duty_kind)` so one Vahak **and** one सत्संग चरणसेवक can exist per place per Thursday.
4. Leaves सत्संग चरणसेवक empty until मार्गदर्शक (or last week’s सत्संग चरणसेवक filling an empty slot) appoints from the new dropdown.
5. Does **not** auto-continue last week’s सत्संग चरणसेवक. Vahak Friday window + auto-continue stay scoped to `duty_kind=vahak`.

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
```

SQLite lives at `data/satsang.db` next to the app. Do not use Turso unless you run multiple instances.

`GET /api/health` returns `{ ok, db: { store: "file" | "turso" }, production_ready }` when the store is reachable.

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
