# परमानंद धाम सत्संग / Paramanand Dham Satsang

Marathi-first mobile web app to **record and report** Thursday satsang — not a WhatsApp bot.

WhatsApp remains the notice channel. This app stores:

1. **Attendance by place** (पुरुष / स्त्रिया / बालके)
2. **Topic** — आत्मप्रभा (Atmaprabha) or उपदेश (Upadesh) + conductor
3. **Q&A** — answers from आत्मप्रभा or मधुसुदनदास विजयानंद
4. **Weekly report** with WhatsApp-copyable Marathi text

Default satsang time: **Thursday 8:00 PM (IST)**.

## Roles

| Role | Name | Phone |
| --- | --- | --- |
| Super admin | मधुसुदनदास विजयानंद | 9850120960 |
| Software | KAILAS ADHAV | 9225118811 |

App login is a simple **admin PIN** (`ADMIN_PIN`, default `1960`). Web members start with **अजपा / ajpa** at `/register` (not नोंदणी). WhatsApp still uses locked `अजपा Q` / `अजपा A` (see below) — those command shapes are not merged yet.

## Seed places

1. श्री क्षेत्र रानअंत्री
2. वरखेड
3. बरटाळा
4. अंबाशी
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

- Local: SQLite file `data/satsang.db` via `@libsql/client` (created on first request; gitignored)
- Production (Vercel): **Turso** (libSQL over HTTP). A SQLite file on Vercel serverless is ephemeral and must not be used for attendance / Q&A.
- Cookie session after PIN (`satsang_session`); member session is a separate cookie (`satsang_member`)
- Change PIN with env `ADMIN_PIN`
- Optional `SESSION_SECRET` for cookie HMAC
- On Vercel, login cookies are marked `Secure` automatically. Locally, keep `COOKIE_SECURE=false` unless you use HTTPS.

```
ADMIN_PIN=1960
SESSION_SECRET=change-me-in-production
COOKIE_SECURE=false
```

### Production URL

- **Primary (Hostinger VPS):** [https://satsang.dhyeyapurti.in](https://satsang.dhyeyapurti.in)  
  Full self-host steps: [`docs/VPS_HOSTINGER.md`](docs/VPS_HOSTINGER.md) · script: `deploy/setup-vps.sh`
- Optional Vercel mirror: `https://paramanand-dham-satsang.vercel.app` (needs Turso)

### Vercel production

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

`GET /api/health` returns `{ ok, db: { store: "turso" | "file" } }` when the store is reachable.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- libSQL (`@libsql/client`) — local file or Turso

## License

Operational tool for परमानंद धाम satsang coordinators — not for redistribution.
