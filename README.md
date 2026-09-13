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

App login is a simple **admin PIN** (`ADMIN_PIN`, default `1960`). Role names above are operational, not a second login system.

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
| अजपा | `/ajapa` | WhatsApp Ajapa Q→AI→guru flow (live) |
| अहवाल | `/report` | Per-place summary + copy/open WhatsApp |

Short aliases: `/a` `/t` `/q` `/j` `/r`.

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
- Multi-user RBAC beyond the shared admin PIN
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
- Cookie session after PIN; change PIN with env `ADMIN_PIN`
- Optional `SESSION_SECRET` for cookie HMAC
- On Vercel, login cookies are marked `Secure` automatically. Locally, keep `COOKIE_SECURE=false` unless you use HTTPS.

```
ADMIN_PIN=1960
SESSION_SECRET=change-me-in-production
COOKIE_SECURE=false
```

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

4. Redeploy after saving env vars. Turn **Deployment Protection** off so phones can open the URL without a Vercel login.
5. Short aliases on the production host: `/a` → attendance, `/t` → topic, `/q` → questions, `/j` → ajapa, `/r` → report.

`GET /api/health` returns `{ ok, db: { store: "turso" | "file" } }` when the store is reachable.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- libSQL (`@libsql/client`) — local file or Turso

## License

Private operational tool for परमानंद धाम satsang coordinators.
