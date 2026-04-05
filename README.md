# FeedPulse

**FeedPulse** is an internal-style web app for collecting product feedback and enriching it with **Google Gemini**: automatic category, sentiment, priority score (1–10), summary, and tags. The stack matches the assignment brief: **Next.js** (App Router) frontend, **Node.js + Express** API, **MongoDB** with Mongoose, and **JWT**-protected admin routes.

## Repository layout

```
feedpulse/
├── frontend/          # Next.js — public landing, submit form, admin UI
├── backend/           # Express REST API, Gemini service, MongoDB models
├── README.md          # This file
└── .gitignore
```

| Area        | Route / entry                         | Purpose                                      |
|------------|----------------------------------------|----------------------------------------------|
| Public     | `/`, `/submit`                         | Landing + anonymous feedback form            |
| Admin      | `/login`, `/dashboard`                 | Hardcoded admin login (env), JWT in `localStorage` |
| API        | `http://localhost:4000` (configurable) | REST API consumed by the frontend            |

## Tech stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS  
- **Backend:** Express, Mongoose, `jsonwebtoken`, `express-rate-limit`, `@google/generative-ai`  
- **Database:** MongoDB  
- **AI:** Google Gemini (`GEMINI_MODEL`, default `gemini-1.5-flash`)

## Prerequisites

- Node.js 18+  
- MongoDB running locally (or a connection string to Atlas)  
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini  

## Environment variables

Copy examples and fill in secrets (never commit `.env`).

**Backend** — copy `backend/.env.example` to `backend/.env`:

- `MONGO_URI` — MongoDB connection string  
- `GEMINI_API_KEY` — required for real AI analysis (without it, feedback still saves; AI fields stay empty)  
- `JWT_SECRET` — long random string for signing admin JWTs  
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — admin login (defaults shown in `.env.example`)  
- `CORS_ORIGIN` — e.g. `http://localhost:3000`  

**Frontend** — copy `frontend/.env.example` to `frontend/.env.local`:

- `NEXT_PUBLIC_API_URL` — backend base URL, e.g. `http://localhost:4000`  

## Run locally (step by step)

1. **Start MongoDB** (if local): ensure `mongod` is running or use Atlas.

2. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env: MONGO_URI, GEMINI_API_KEY, JWT_SECRET, etc.
   npm install
   npm run dev
   ```

   API listens on port **4000** by default.

3. **Frontend** (new terminal)

   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

4. Open **http://localhost:3000** — submit feedback without logging in.  
   Open **http://localhost:3000/login** — sign in as admin, then open **Dashboard** to manage items.

## API overview (consistent JSON shape)

Responses use: `{ success, data, error, message }`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/feedback` | No | Submit feedback (rate-limited: 5/hour per IP) |
| `GET` | `/api/feedback` | Bearer JWT | List + filters, pagination, stats |
| `GET` | `/api/feedback/summary` | Bearer JWT | Top 3 themes (last 7 days), AI-generated |
| `GET` | `/api/feedback/:id` | Bearer JWT | Single item |
| `PATCH` | `/api/feedback/:id` | Bearer JWT | Update status |
| `DELETE` | `/api/feedback/:id` | Bearer JWT | Delete |
| `POST` | `/api/feedback/:id/reanalyze` | Bearer JWT | Re-run Gemini on one item |
| `POST` | `/api/auth/login` | No | Admin login → JWT |

## Screenshots

Add your own screenshots here when you record them:

1. **Public submit form** — `frontend/docs/screenshots/submit.png` (create folder if needed)  
2. **Admin dashboard** — `frontend/docs/screenshots/dashboard.png`  

Example in Markdown:

```markdown
![Submit feedback](./frontend/docs/screenshots/submit.png)
![Dashboard](./frontend/docs/screenshots/dashboard.png)
```

## What I would build next

- Email notifications to submitters on status changes  
- Proper admin `User` model in MongoDB instead of env-only credentials  
- Background job queue for Gemini when traffic grows  
- Docker Compose for one-command local/demo runs  

## License

ISC (backend default) — adjust as needed for your submission.
