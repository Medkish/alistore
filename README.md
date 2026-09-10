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
{ "books": [ { "id": "python", "title": "Python", "author": "Armor Ramsey", "price": 40, "image": "images/programming1.jpeg", "stock": 12, "rating": 4.8, "category": { "name": "Programming" } } ] }
```

Data lives in PostgreSQL. Passwords are hashed with bcrypt; sessions are stored as
random tokens in the `Session` table.

## Deployment

Live URL: `https://medkish.github.io/alistore/`.

The static build in `frontend/out/` is committed to the `gh-pages` branch and served
from its root. To update the live site after changing the app:

```bash
cd frontend
npm run build
git subtree push --prefix out origin gh-pages
```

(or copy `out/*` into a `gh-pages` checkout and push).

Set once in **Settings → Pages → Build and deployment → Source: Deploy from a branch →
branch: gh-pages → folder: / (root)**.

A GitHub Actions workflow (`.github/workflows/deploy.yml`, auto-building `frontend/out`
on every push) is included locally — enable it by adding the file in the GitHub web UI
if you prefer automated deploys.