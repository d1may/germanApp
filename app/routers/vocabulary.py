import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Vocabulary, VocabularyDeck
from app.schemas import (
    BulkDeleteIds,
    VocabularyCreate,
    VocabularyDeckCreate,
    VocabularyDeckRead,
    VocabularyDeckUpdate,
    VocabularyRead,
    VocabularyUpdate,
)

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("/", response_model=list[VocabularyRead])
def list_vocabulary(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tag: str | None = None,
    search: str | None = None,
    deck_id: int | None = None,
    without_deck: bool = False,
    sort: str = Query("newest", description="newest, oldest, or alphabet"),
    important_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Vocabulary).where(Vocabulary.user_id == user.id)
    if tag:
        stmt = stmt.where(Vocabulary.tags.contains(tag))
    if important_only:
        stmt = stmt.where(Vocabulary.important == True)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Vocabulary.word.ilike(pattern) | Vocabulary.translation.ilike(pattern)
        )
    if without_deck:
        stmt = stmt.where(Vocabulary.deck_id.is_(None))
    elif deck_id is not None:
        stmt = stmt.where(Vocabulary.deck_id == deck_id)
    if sort == "alphabet":
        sort_key = func.lower(Vocabulary.word)
        for old, new in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
            sort_key = func.replace(sort_key, old, new)
        order = sort_key.asc()
    elif sort == "oldest":
        order = Vocabulary.created_at.asc()
    else:
        order = Vocabulary.created_at.desc()
    stmt = stmt.order_by(order).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.get("/export")
def export_vocabulary_csv(
    tag: str | None = None,
    search: str | None = None,
    deck_id: int | None = None,
    without_deck: bool = False,
    sort: str = Query("newest", description="newest, oldest, or alphabet"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export vocabulary as CSV. Uses same filters as list (tag, search)."""
    stmt = select(Vocabulary).where(Vocabulary.user_id == user.id)
    if tag:
        stmt = stmt.where(Vocabulary.tags.contains(tag))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Vocabulary.word.ilike(pattern) | Vocabulary.translation.ilike(pattern)
        )
    if without_deck:
        stmt = stmt.where(Vocabulary.deck_id.is_(None))
    elif deck_id is not None:
        stmt = stmt.where(Vocabulary.deck_id == deck_id)
    if sort == "alphabet":
        sort_key = func.lower(Vocabulary.word)
        for old, new in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
            sort_key = func.replace(sort_key, old, new)
        order = sort_key.asc()
    elif sort == "oldest":
        order = Vocabulary.created_at.asc()
    else:
        order = Vocabulary.created_at.desc()
    items = db.scalars(stmt.order_by(order)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    deck_names = {
        row[0]: row[1]
        for row in db.execute(
            select(VocabularyDeck.id, VocabularyDeck.name).where(VocabularyDeck.user_id == user.id)
        ).all()
    }
    writer.writerow(["word", "translation", "example", "tags", "deck", "correct_count", "wrong_count"])
    for v in items:
        writer.writerow([
            v.word,
            v.translation,
            v.example or "",
            v.tags or "",
            deck_names.get(v.deck_id, ""),
            v.correct_count,
            v.wrong_count,
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vocabulary.csv"},
    )


@router.post("/import")
def import_vocabulary_csv(
    file: UploadFile = File(...),
    deck_id: int | None = Query(
        None,
        description="If set, every imported row is assigned to this deck (CSV deck column ignored).",
    ),
    force_no_deck: bool = Query(
        False,
        description="If true, every imported row has no deck (CSV deck column ignored).",
    ),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import vocabulary from CSV. Header row (word, translation, example, tags) or headerless
    two columns. Requires deck_id (all rows go to that deck) or force_no_deck=true (unassigned).
    Comma, tab, or semicolon delimiters."""
    if deck_id is not None and force_no_deck:
        raise HTTPException(400, "Use either deck_id or force_no_deck, not both")
    if deck_id is None and not force_no_deck:
        raise HTTPException(
            400,
            "Import needs a target: pass deck_id for a deck, or force_no_deck=true for words without a deck.",
        )
    if deck_id is not None:
        deck = db.get(VocabularyDeck, deck_id)
        if not deck or deck.user_id != user.id:
            raise HTTPException(400, "Deck not found")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(content[:4096], delimiters=",\t;")
    except csv.Error:
        dialect = csv.excel

    lines = list(csv.reader(io.StringIO(content), dialect))
    if not lines:
        return {"created": 0, "errors": ["File is empty"]}

    created = 0
    errors = []
    has_header = (
        "word" in [c.strip().lower() for c in lines[0]]
        or "translation" in [c.strip().lower() for c in lines[0]]
    )
    start = 1 if has_header else 0

    seen_in_file = set()
    for i, row in enumerate(lines[start:], start=start + 1):
        if len(row) < 2:
            if any(c.strip() for c in row):
                errors.append(f"Row {i}: need at least 2 columns")
            continue
        word = (row[0] or "").strip()
        translation = (row[1] or "").strip()
        if not word or not translation:
            continue
        key = _normalize_key(word, translation)
        example = (row[2] or "").strip() or None if len(row) > 2 else None
        tags = (row[3] or "").strip() or None if len(row) > 3 else None
        row_deck_id = deck_id if deck_id is not None else None
        file_key = (key[0], key[1], row_deck_id)
        if file_key in seen_in_file:
            continue
        seen_in_file.add(file_key)
        if _vocabulary_duplicate_exists(db, user.id, key, row_deck_id):
            continue
        vocab = Vocabulary(
            user_id=user.id,
            deck_id=row_deck_id,
            word=word,
            translation=translation,
            example=example,
            tags=tags,
        )
        db.add(vocab)
        created += 1

    db.commit()
    return {"created": created, "errors": errors[:10]}


@router.get("/count")
def vocabulary_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.scalar(
        select(func.count(Vocabulary.id)).where(Vocabulary.user_id == user.id)
    )
    return {"count": count}


@router.post("/bulk-delete", status_code=200)
def bulk_delete_vocabulary(
    body: BulkDeleteIds,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete multiple vocabulary entries by IDs. Only user's own entries are deleted."""
    deleted = 0
    for vid in body.ids:
        vocab = db.get(Vocabulary, vid)
        if vocab and vocab.user_id == user.id:
            db.delete(vocab)
            deleted += 1
    db.commit()
    return {"deleted": deleted}


@router.get("/item/{vocab_id}", response_model=VocabularyRead)
def get_vocabulary(vocab_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab or vocab.user_id != user.id:
        raise HTTPException(404, "Vocabulary entry not found")
    return vocab


def _normalize_key(word: str, translation: str) -> tuple[str, str]:
    return (word.strip().lower(), (translation or "").strip().lower())


def _vocabulary_duplicate_exists(
    db: Session,
    user_id: int,
    key: tuple[str, str],
    deck_id: int | None,
    exclude_vocab_id: int | None = None,
) -> bool:
    """Same word+translation may exist in different decks; not twice in the same deck (or twice without deck)."""
    stmt = select(Vocabulary.id).where(
        Vocabulary.user_id == user_id,
        func.lower(func.trim(Vocabulary.word)) == key[0],
        func.lower(func.trim(Vocabulary.translation)) == key[1],
    )
    if deck_id is None:
        stmt = stmt.where(Vocabulary.deck_id.is_(None))
    else:
        stmt = stmt.where(Vocabulary.deck_id == deck_id)
    if exclude_vocab_id is not None:
        stmt = stmt.where(Vocabulary.id != exclude_vocab_id)
    return db.scalars(stmt).first() is not None


@router.post("/", response_model=VocabularyRead, status_code=201)
def create_vocabulary(data: VocabularyCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.deck_id is not None:
        deck = db.get(VocabularyDeck, data.deck_id)
        if not deck or deck.user_id != user.id:
            raise HTTPException(400, "Deck not found")
    key = _normalize_key(data.word, data.translation)
    if _vocabulary_duplicate_exists(db, user.id, key, data.deck_id):
        raise HTTPException(
            400,
            "This word with this translation already exists in this deck"
            if data.deck_id is not None
            else "This word with this translation already exists without a deck",
        )
    vocab = Vocabulary(user_id=user.id, **data.model_dump())
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return vocab


@router.put("/item/{vocab_id}", response_model=VocabularyRead)
def update_vocabulary(
    vocab_id: int,
    data: VocabularyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab or vocab.user_id != user.id:
        raise HTTPException(404, "Vocabulary entry not found")
    dump = data.model_dump(exclude_unset=True)
    if "deck_id" in dump and dump["deck_id"] is not None:
        deck = db.get(VocabularyDeck, dump["deck_id"])
        if not deck or deck.user_id != user.id:
            raise HTTPException(400, "Deck not found")
    word = dump.get("word", vocab.word)
    translation = dump.get("translation", vocab.translation)
    effective_deck_id = dump["deck_id"] if "deck_id" in dump else vocab.deck_id
    key = _normalize_key(word, translation)
    if _vocabulary_duplicate_exists(db, user.id, key, effective_deck_id, exclude_vocab_id=vocab_id):
        raise HTTPException(
            400,
            "This word with this translation already exists in this deck"
            if effective_deck_id is not None
            else "This word with this translation already exists without a deck",
        )
    for field, value in dump.items():
        setattr(vocab, field, value)
    db.commit()
    db.refresh(vocab)
    return vocab


@router.delete("/item/{vocab_id}", status_code=204)
def delete_vocabulary(vocab_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab or vocab.user_id != user.id:
        raise HTTPException(404, "Vocabulary entry not found")
    db.delete(vocab)
    db.commit()


@router.get("/decks", response_model=list[VocabularyDeckRead])
def list_decks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = (
        select(VocabularyDeck)
        .where(VocabularyDeck.user_id == user.id)
        .order_by(func.lower(VocabularyDeck.name).asc())
    )
    return db.scalars(stmt).all()


@router.post("/decks", response_model=VocabularyDeckRead, status_code=201)
def create_deck(
    data: VocabularyDeckCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Deck name cannot be empty")
    existing = db.scalars(
        select(VocabularyDeck).where(
            VocabularyDeck.user_id == user.id,
            func.lower(func.trim(VocabularyDeck.name)) == name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(400, "Deck with this name already exists")
    deck = VocabularyDeck(user_id=user.id, name=name)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


@router.put("/decks/{deck_id}", response_model=VocabularyDeckRead)
def update_deck(
    deck_id: int,
    data: VocabularyDeckUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = db.get(VocabularyDeck, deck_id)
    if not deck or deck.user_id != user.id:
        raise HTTPException(404, "Deck not found")
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Deck name cannot be empty")
    existing = db.scalars(
        select(VocabularyDeck).where(
            VocabularyDeck.user_id == user.id,
            VocabularyDeck.id != deck_id,
            func.lower(func.trim(VocabularyDeck.name)) == name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(400, "Deck with this name already exists")
    deck.name = name
    db.commit()
    db.refresh(deck)
    return deck


@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.get(VocabularyDeck, deck_id)
    if not deck or deck.user_id != user.id:
        raise HTTPException(404, "Deck not found")
    db.execute(
        delete(Vocabulary).where(
            Vocabulary.user_id == user.id,
            Vocabulary.deck_id == deck_id,
        )
    )
    db.delete(deck)
    db.commit()
