import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Vocabulary
from app.schemas import FlashcardAnswer, FlashcardQuestion, FlashcardResult

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


def _pick_weighted(vocab_list: list[Vocabulary]) -> Vocabulary:
    """Pick a word with probability proportional to its weight (higher = less known)."""
    weights = [v.weight for v in vocab_list]
    return random.choices(vocab_list, weights=weights, k=1)[0]


@router.get("/next", response_model=FlashcardQuestion)
def next_flashcard(
    tag: str | None = None,
    direction: str = "de_to_en",
    db: Session = Depends(get_db),
):
    """Get the next flashcard. `direction` is 'de_to_en' or 'en_to_de'."""
    stmt = select(Vocabulary)
    if tag:
        stmt = stmt.where(Vocabulary.tags.contains(tag))
    all_vocab = db.scalars(stmt).all()
    if not all_vocab:
        raise HTTPException(404, "No vocabulary words found")

    picked = _pick_weighted(list(all_vocab))
    if direction == "en_to_de":
        prompt = f"Translate to German: {picked.translation}"
    else:
        prompt = f"Translate to English: {picked.word}"

    return FlashcardQuestion(
        vocabulary_id=picked.id,
        word=picked.word,
        translation=picked.translation,
        prompt=prompt,
    )


@router.post("/answer", response_model=FlashcardResult)
def answer_flashcard(
    body: FlashcardAnswer,
    direction: str = "de_to_en",
    db: Session = Depends(get_db),
):
    """Submit an answer and get feedback. Weight adjusts based on correctness."""
    vocab = db.get(Vocabulary, body.vocabulary_id)
    if not vocab:
        raise HTTPException(404, "Vocabulary entry not found")

    expected = vocab.translation if direction == "de_to_en" else vocab.word
    is_correct = body.answer.strip().lower() == expected.strip().lower()

    if is_correct:
        vocab.correct_count += 1
        vocab.weight = max(0.1, vocab.weight * 0.8)
    else:
        vocab.wrong_count += 1
        vocab.weight = min(10.0, vocab.weight * 1.3)

    db.commit()
    db.refresh(vocab)

    return FlashcardResult(
        vocabulary_id=vocab.id,
        word=vocab.word,
        correct_answer=expected,
        your_answer=body.answer,
        is_correct=is_correct,
        correct_count=vocab.correct_count,
        wrong_count=vocab.wrong_count,
    )
