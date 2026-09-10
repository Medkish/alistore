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

When a backend is reachable on the same origin the frontend uses it for auth,
orders, donations and subscriptions; otherwise it falls back to local storage.

## Backend (`backend/`)

Express API that also serves the frontend for local development.

```bash
cd backend
npm install
npm start        # http://localhost:3000
```

## API endpoints

| Method | Endpoint                | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`    | Create account → `{ token, user }`       |
| POST   | `/api/auth/login`       | Login → `{ token, user }`                |
| GET    | `/api/auth/me`          | Current user (Bearer token)              |
| POST   | `/api/auth/logout`      | Invalidate token                         |
| GET    | `/api/books`            | Book catalog                             |
| GET    | `/api/cart`             | User cart (Bearer token)                 |
| PUT    | `/api/cart`             | Replace cart items                       |
| POST   | `/api/orders`           | Place order (Bearer token)               |
| GET    | `/api/orders`           | User's orders                            |
| POST   | `/api/donations`        | Record a donation                        |
| POST   | `/api/subscriptions`    | Record a subscription                    |
| GET    | `/api/health`           | Health check                             |

Data is stored in `backend/data/db.json` (created automatically, gitignored). Passwords
are hashed with bcrypt; tokens are random 48-hex session tokens.

## Deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `npm run build`
inside `frontend/` and publishes the static `out/` folder to GitHub Pages, keeping the
live URL at `https://medkish.github.io/alistore/`.

Set once in **Settings → Pages → Build and deployment → Source: GitHub Actions**.