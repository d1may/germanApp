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
