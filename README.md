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
| प्रश्न | `/questions` | Questions for the week; answers + source |
| अहवाल | `/report` | Per-place summary + copy/open WhatsApp |

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

- SQLite file: `data/satsang.db` (created on first request; gitignored)
- Engine: `better-sqlite3`
- Cookie session after PIN; change PIN with env `ADMIN_PIN`
- Optional `SESSION_SECRET` for cookie HMAC

```
ADMIN_PIN=1960
SESSION_SECRET=change-me-in-production
```

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- SQLite (`better-sqlite3`)

## Out of scope (MVP)

- WhatsApp bots / Cloud API webhooks
- Native iOS/Android apps
- Multi-user RBAC beyond the shared admin PIN

## License

Private operational tool for परमानंद धाम satsang coordinators.
