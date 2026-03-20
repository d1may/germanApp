# German Language Learning App

A German learning app with vocabulary, grammar rules, strong verbs, flashcards, and an AI tutor.

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Frontend:** React, Vite, Tailwind CSS

## Setup

```bash
# With uv (recommended)
uv sync

# Or with pip
pip install .
```

Create `.env` in the project root:

```
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=sqlite:///./german_app.db
JWT_SECRET=dev-change-me
FRONTEND_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
```

## Run

### Production (single server)

```bash
cd frontend && npm install && npm run build && cd ..
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000

### Development (hot reload)

Two terminals:

```bash
# Terminal 1: backend
uv run uvicorn app.main:app --reload

# Terminal 2: frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

## Auth (local accounts)

- Register: `POST /auth/register`
- Login: `POST /auth/login` (sets HttpOnly `access_token` cookie)
- Logout: `POST /auth/logout`
- Current user: `GET /auth/me`

All learning data is scoped per-user (vocabulary/grammar/flashcards/chat).

## Google OAuth (next step)

When you’re ready to add a “Sign in with Google” button:

1. Create OAuth credentials in **Google Cloud Console**:
   - OAuth consent screen (External/Internal)
   - OAuth Client ID (Web application)
2. Configure redirect URIs (examples for dev):
   - `http://localhost:8000/auth/google/callback`
3. Add env vars:
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback`
4. Backend endpoints to implement:
   - `GET /auth/google/login` → redirect to Google auth URL
   - `GET /auth/google/callback` → exchange code → get user info → create/find user → set `access_token` cookie → redirect to frontend
5. Frontend:
   - Add a button on `/login` that navigates to `/auth/google/login`

## Features

### Vocabulary
- CRUD for words (word, translation, example, tags)
- Filter by level (A1–C2) and search
- Sort by date added (newest/oldest)
- **Important** — star button to mark words, filter to show important only
- **Export CSV** — download vocabulary as CSV
- **Import CSV** — upload from CSV (with or without headers)

### Strong Verbs (Starke Verben)
- Table of strong verbs (Infinitiv, Präteritum, Partizip II)
- Search by verb form or translation
- Star to mark verbs as important (stored in localStorage)
- Filter to show important verbs only

### Grammar
- CRUD for rules (title, content, tags)
- Search and filter by tags

### Flashcards
- Two modes: **Vocabulary** and **Strong Verbs**
- **Vocabulary:** weighted cards (words you get wrong appear more often), DE → EN or EN → DE, filter by tag, **Important only**
- **Strong Verbs:** Partizip II or Präteritum, **Important only** filter
- Automatic weight adjustment for vocabulary answers

### Chat (AI Tutor)
- Chat with GPT that knows your vocabulary and grammar
- “Add to dictionary” command — ask the bot to save a word
- History persists in localStorage (survives page navigation)
- Clear button to reset the conversation

---

## API

| Endpoint | Description |
|----------|-------------|
| `GET/POST/PUT/DELETE /vocabulary/` | Vocabulary CRUD |
| `GET /vocabulary/export` | Export to CSV |
| `POST /vocabulary/import` | Import from CSV |
| `GET/POST/PUT/DELETE /grammar/` | Grammar CRUD |
| `GET /flashcards/next` | Get next flashcard |
| `POST /flashcards/answer` | Submit answer |
| `POST /chat/` | Chat with tutor |

API docs: http://localhost:8000/docs
