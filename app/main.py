from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import auth, chat, flashcards, grammar, vocabulary
from app.security import hash_password

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def _migrate_add_important():
    """Add important column to vocabulary if missing (for existing DBs)."""
    with engine.connect() as conn:
        r = conn.execute(text("PRAGMA table_info(vocabulary)"))
        cols = [row[1] for row in r]
        if "important" not in cols:
            conn.execute(text("ALTER TABLE vocabulary ADD COLUMN important BOOLEAN DEFAULT 0"))
            conn.commit()


def _migrate_add_user_id_columns():
    with engine.connect() as conn:
        vocab_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(vocabulary)"))]
        if "user_id" not in vocab_cols:
            conn.execute(text("ALTER TABLE vocabulary ADD COLUMN user_id INTEGER"))
            conn.commit()

        grammar_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(grammar_rules)"))]
        if "user_id" not in grammar_cols:
            conn.execute(text("ALTER TABLE grammar_rules ADD COLUMN user_id INTEGER"))
            conn.commit()


def _migrate_add_vocabulary_deck_id():
    with engine.connect() as conn:
        vocab_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(vocabulary)"))]
        if "deck_id" not in vocab_cols:
            conn.execute(text("ALTER TABLE vocabulary ADD COLUMN deck_id INTEGER"))
            conn.commit()


def _ensure_default_admin_user():
    with engine.connect() as conn:
        users_table = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        ).scalar()
        if not users_table:
            return
        admin_id = conn.execute(
            text("SELECT id FROM users WHERE username = :u LIMIT 1"),
            {"u": settings.default_admin_username},
        ).scalar()
        if admin_id is None:
            ph = hash_password(settings.default_admin_password)
            conn.execute(
                text(
                    "INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p)"
                ),
                {"u": settings.default_admin_username, "e": None, "p": ph},
            )
            conn.commit()


def _backfill_user_ids_to_default_admin():
    with engine.connect() as conn:
        admin_id = conn.execute(
            text("SELECT id FROM users WHERE username = :u LIMIT 1"),
            {"u": settings.default_admin_username},
        ).scalar()
        if admin_id is None:
            return
        conn.execute(
            text("UPDATE vocabulary SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": admin_id},
        )
        conn.execute(
            text("UPDATE grammar_rules SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": admin_id},
        )
        conn.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_add_important()
    _migrate_add_user_id_columns()
    _migrate_add_vocabulary_deck_id()
    _ensure_default_admin_user()
    _backfill_user_ids_to_default_admin()
    yield


app = FastAPI(
    title="German Language Learning API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.frontend_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vocabulary.router)
app.include_router(grammar.router)
app.include_router(flashcards.router)
app.include_router(chat.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}


if FRONTEND_DIR.is_dir():

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve static files or index.html for SPA routing (e.g. /strong-verbs)."""
        path = (FRONTEND_DIR / full_path).resolve()
        if path.is_file() and str(path).startswith(str(FRONTEND_DIR.resolve())):
            return FileResponse(path)
        index_path = FRONTEND_DIR / "index.html"
        if index_path.is_file():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Not Found")

