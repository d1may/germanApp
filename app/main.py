from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.database import Base, engine
from app.routers import chat, flashcards, grammar, vocabulary

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def _migrate_add_important():
    """Add important column to vocabulary if missing (for existing DBs)."""
    with engine.connect() as conn:
        r = conn.execute(text("PRAGMA table_info(vocabulary)"))
        cols = [row[1] for row in r]
        if "important" not in cols:
            conn.execute(text("ALTER TABLE vocabulary ADD COLUMN important BOOLEAN DEFAULT 0"))
            conn.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_add_important()
    yield


app = FastAPI(
    title="German Language Learning API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

