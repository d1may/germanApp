import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Vocabulary
from app.schemas import VocabularyCreate, VocabularyRead, VocabularyUpdate

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("/", response_model=list[VocabularyRead])
def list_vocabulary(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tag: str | None = None,
    search: str | None = None,
    sort: str = Query("newest", description="newest or oldest by created_at"),
    db: Session = Depends(get_db),
):
    stmt = select(Vocabulary)
    if tag:
        stmt = stmt.where(Vocabulary.tags.contains(tag))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Vocabulary.word.ilike(pattern) | Vocabulary.translation.ilike(pattern)
        )
    order = Vocabulary.created_at.asc() if sort == "oldest" else Vocabulary.created_at.desc()
    stmt = stmt.order_by(order).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.get("/export")
def export_vocabulary_csv(
    tag: str | None = None,
    search: str | None = None,
    sort: str = Query("newest", description="newest or oldest by created_at"),
    db: Session = Depends(get_db),
):
    """Export vocabulary as CSV. Uses same filters as list (tag, search)."""
    stmt = select(Vocabulary)
    if tag:
        stmt = stmt.where(Vocabulary.tags.contains(tag))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Vocabulary.word.ilike(pattern) | Vocabulary.translation.ilike(pattern)
        )
    order = Vocabulary.created_at.asc() if sort == "oldest" else Vocabulary.created_at.desc()
    items = db.scalars(stmt.order_by(order)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["word", "translation", "example", "tags", "correct_count", "wrong_count"])
    for v in items:
        writer.writerow([
            v.word,
            v.translation,
            v.example or "",
            v.tags or "",
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
    db: Session = Depends(get_db),
):
    """Import vocabulary from CSV. Supports: 1) Header row (word, translation, example, tags)
    2) Headerless: first col=word, second col=translation. Handles comma, tab, semicolon."""
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

    for i, row in enumerate(lines[start:], start=start + 1):
        if len(row) < 2:
            if any(c.strip() for c in row):
                errors.append(f"Row {i}: need at least 2 columns")
            continue
        word = (row[0] or "").strip()
        translation = (row[1] or "").strip()
        if not word or not translation:
            continue
        example = (row[2] or "").strip() or None if len(row) > 2 else None
        tags = (row[3] or "").strip() or None if len(row) > 3 else None
        vocab = Vocabulary(word=word, translation=translation, example=example, tags=tags)
        db.add(vocab)
        created += 1

    db.commit()
    return {"created": created, "errors": errors[:10]}


@router.get("/count")
def vocabulary_count(db: Session = Depends(get_db)):
    count = db.scalar(select(func.count(Vocabulary.id)))
    return {"count": count}


@router.get("/{vocab_id}", response_model=VocabularyRead)
def get_vocabulary(vocab_id: int, db: Session = Depends(get_db)):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab:
        raise HTTPException(404, "Vocabulary entry not found")
    return vocab


@router.post("/", response_model=VocabularyRead, status_code=201)
def create_vocabulary(data: VocabularyCreate, db: Session = Depends(get_db)):
    vocab = Vocabulary(**data.model_dump())
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return vocab


@router.put("/{vocab_id}", response_model=VocabularyRead)
def update_vocabulary(
    vocab_id: int, data: VocabularyUpdate, db: Session = Depends(get_db)
):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab:
        raise HTTPException(404, "Vocabulary entry not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(vocab, field, value)
    db.commit()
    db.refresh(vocab)
    return vocab


@router.delete("/{vocab_id}", status_code=204)
def delete_vocabulary(vocab_id: int, db: Session = Depends(get_db)):
    vocab = db.get(Vocabulary, vocab_id)
    if not vocab:
        raise HTTPException(404, "Vocabulary entry not found")
    db.delete(vocab)
    db.commit()
