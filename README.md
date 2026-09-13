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

App login is a simple **admin PIN** (`ADMIN_PIN`, default `1960`) for coordinators. **चरणसेवक** (members) register at `/register` and sign in with mobile + login code (default: last 4 digits of the mobile). If that last-4 is already taken, the first member keeps it and the new member gets a random unique 6-digit code (flagged for admin on `/members` and the report page).

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
| प्रश्न | `/questions` | Questions for the week; answers + source |
| अहवाल | `/report` | Per-place summary + copy/open WhatsApp |

Member (separate session cookie):

| Screen | Route | Use |
| --- | --- | --- |
| नोंदणी | `/register` (`/reg`) | Name, 10-digit mobile, place |
| सेवक प्रवेश | `/member-login` | Mobile + login code |
| सेवक घर | `/me` (`/m`) | Own profile + weekly question / one ANS |
| सेवक यादी | `/members` | Admin: members + 6-digit collision flags |
| साप्ताहिक प्रश्न | `/weekly` | Admin: one question + source per Thursday |

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
- `members` table: id, name, mobile (unique), place_code, login_code, login_code_collision, created_at. SQL up/down in `sql/`
- Change PIN with env `ADMIN_PIN`
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
5. Short aliases on the production host: `/a` → attendance, `/t` → topic, `/q` → questions, `/r` → report.

`GET /api/health` returns `{ ok, db: { store: "turso" | "file" } }` when the store is reachable.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- libSQL (`@libsql/client`) — local file or Turso

## Out of scope (MVP)

- WhatsApp bots / Cloud API webhooks
- Native iOS/Android apps
- Full RBAC / roles beyond admin PIN + member mobile login

## License

Private operational tool for परमानंद धाम satsang coordinators.
