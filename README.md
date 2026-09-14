# AlioStore

Online bookstore & programming resources by Alio & Palma Cooperative.

```
ALIOSTORE/
│
├── frontend/   # Next.js + Tailwind CSS + TypeScript static app (PWA-ready)
└── backend/    # Node.js + Express API (auth, cart, orders, donations, subscriptions)
```

## Pages

| Path            | Page               |
|-----------------|--------------------|
| `/`             | Home               |
| `/books/`       | All Books          |
| `/books/[id]/`  | Book Details       |
| `/cart/`        | Cart               |
| `/checkout/`    | Checkout           |
| `/login/`       | Login              |
| `/register/`    | Register           |
| `/orders/`      | My Orders          |
| `/profile/`     | Profile            |

## Frontend (`frontend/`)

React / Next.js static app, Tailwind CSS, TypeScript, deployed via GitHub Pages.

```bash
cd frontend
npm install
npm run dev      # localhost:3000 (next dev, not the API backend)
npm run build    # static export into out/
```

When a backend is reachable on the same origin (or via `NEXT_PUBLIC_API_BASE`) the
frontend uses it for the book catalog, auth, orders, donations and subscriptions;
otherwise it falls back to the local catalog and local storage.

## Backend (`backend/`)

Node.js + Express + **Prisma + PostgreSQL**. The frontend asks the API, the API asks
the database, and the database answers as JSON that renders as book cards.

```
backend/
│
├── src/
│   ├── routes/        # /api/auth, /api/books, /api/categories, /api/cart, /api/orders, ...
│   ├── controllers/   # thin request/response handlers
│   ├── services/      # business logic + Prisma queries
│   ├── middleware/    # auth (required/optional), validation, errors
│   ├── lib/prisma.js  # PrismaClient singleton
│   ├── utils/         # async error wrapper
│   └── server.js      # Express entry (serves frontend/out too)
│
├── prisma/
│   ├── schema.prisma  # User, Session, Category, Book, Order, OrderItem, Donation, Subscription
│   └── seed.js        # category, 10 books, demo user
│
└── .env               # DATABASE_URL, PORT (gitignored; see .env.example)
```

Relationships: `User 1─* Orders 1─* OrderItems *─1 Books *─1 Category`.

```bash
cd backend
npm install
npx prisma generate # generates the client from prisma/schema.prisma
# after DATABASE_URL is set in backend/.env:
npx prisma migrate dev --name init   # creates the tables
npm run prisma:seed                  # loads category + books + demo user
npm start           # http://localhost:4000
```

For local frontend dev against this backend, set in `frontend/.env.local`:
`NEXT_PUBLIC_API_BASE=http://localhost:4000`.

## API endpoints

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`         | Create account → `{ token, user }`       |
| POST   | `/api/auth/login`            | Login → `{ token, user }`                |
| GET    | `/api/auth/me`               | Current user (Bearer token)              |
| POST   | `/api/auth/logout`           | Invalidate token                         |
| GET    | `/api/books`                 | Book catalog (`?q=` & `?category=` filters) |
| GET    | `/api/books/:slug`           | Single book                              |
| GET    | `/api/categories`            | Categories with book counts              |
| GET    | `/api/cart`                  | User cart (Bearer token)                 |
| PUT    | `/api/cart`                  | Replace cart items                       |
| POST   | `/api/orders`                | Place order (Bearer token)               |
| GET    | `/api/orders`                | User's orders                            |
| POST   | `/api/donations`             | Record a donation                        |
| POST   | `/api/subscriptions`         | Record a subscription                    |
| GET    | `/api/health`                | Health check                             |

`GET /api/books` example response:

```json
{ "books": [ { "id": "python", "title": "Python", "author": "Kamara", "price": 40, "image": "images/programming1.jpeg", "stock": 12, "rating": 4.8, "category": { "name": "Programming" } } ] }
```

Data lives in PostgreSQL. Passwords are hashed with bcrypt; sessions are stored as
random tokens in the `Session` table and expire after `SESSION_TTL_HOURS` (default 7 days).

## Production database

Keep **development and production databases strictly separate** via environment variables:

| Environment | Database URL                           | Where it is set          |
| ----------- | -------------------------------------- | ------------------------ |
| Development | `postgresql://...localhost...`         | `backend/.env` (local)   |
| Production  | `postgresql://...provider...?sslmode=require` | Set on the production host (never commit) |

### Migration strategy

- Development: `npx prisma migrate dev --name <name>` (creates a migration + applies it).
- Production: `npm run prisma:migrate:deploy` (applies committed migrations only — never `migrate dev` or `db push`).
- First production deploy: `npx prisma migrate deploy` then `npm run prisma:seed` + `npm run admin:create` once.

### Backups

Dependency-free full backup/restore using the Prisma client (no `pg_dump` required):

```bash
cd backend
npm run db:backup                     # writes backend/backups/alistore-<timestamp>.json
npm run db:restore -- <file> --yes    # ERASES current data, restores snapshot
```

`backend/backups/` is gitignored. For production, run `npm run db:backup` on a schedule
(cron / GitHub Actions scheduled job) and store the JSON off-host. Checklist:

- [x] Schema + Prisma client (migrations in `backend/prisma/migrations/`)
- [x] `.env` vs cloud `DATABASE_URL` separation
- [x] `db:backup` / `db:restore` scripts
- [ ] Scheduled production backups (add cron or CI schedule)

## Deployment

Target pipeline:

```
LOCAL COMPUTER → Git Repository → Production Hosting → Production Database → Domain → HTTPS → ALIOSTORE LIVE
```

### A. Frontend host (static)

| Option | How |
| ------ | --- |
| GitHub Pages (free) | `npm run build` in `frontend/`, push `frontend/out/` to the `gh-pages` branch, or push to `main` and let `.github/workflows/deploy.yml` build it |
| Vercel / Netlify / Cloudflare Pages | Connect the repo, framework **Next.js (static export)**, build `npm run build`, output `out/`, set `NEXT_PUBLIC_API_BASE` to the backend URL |

GitHub Pages deploy (current):
```bash
cd frontend
npm run build
git subtree push --prefix out origin gh-pages
```

### B. Backend API host

| Option | Notes |
| ------ | ----- |
| Render / Railway / Fly.io | Pair with a managed PostgreSQL (Neon, Supabase, Render) |
| Full VPS (DigitalOcean / Hetzner) | `node src/server.js`, PM2 or systemd, reverse proxy via Caddy/Nginx |

Production env (`backend/.env` on the host):
```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"
PORT=4000
CORS_ORIGIN="https://yourdomain.com"
NODE_ENV="production"
PAYMENT_WEBHOOK_SECRET="<random hex>"
SESSION_TTL_HOURS=168
```

### C. Domain + HTTPS

1. Buy the domain and point an `A`/`CNAME` record at the host.
2. Enable automatic HTTPS: GitHub Pages provides it; Vercel/Netlify/Cloudflare free; on a VPS use Caddy (auto-TLS) or Nginx + certbot.
3. Set `CORS_ORIGIN` and `NEXT_PUBLIC_API_BASE` to the **https** domain — never `http://`.

### D. Secrets & hygiene

- Never commit `.env`, `.env.local`, `backend/*.pid` or `backend/backups/`.
- Rotate `PAYMENT_WEBHOOK_SECRET` and admin passwords before launch; use strong, unique values.
- `frontend/out/` must not contain `localhost` after a production build
  (verified: run a grep over `frontend/out/` for `localhost` before pushing).

Live URL: `https://medkish.github.io/alistore/` (storefront; the admin dashboard needs the backend host above).

The static build in `frontend/out/` is committed to the `gh-pages` branch and served
from its root. Set once in **Settings → Pages → Build and deployment → Source: Deploy from a branch →
branch: gh-pages → folder: / (root)**.

The GitHub Actions workflow (`.github/workflows/deploy.yml`, auto-building `frontend/out`
on every `main` push using GitHub Actions + Pages) is tracked in the repo and deploys automatically.