from datetime import datetime

from pydantic import BaseModel, Field


# --- Auth / User ---


class UserRead(BaseModel):
    id: int
    username: str
    email: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: str | None = Field(None, max_length=320)
    password: str = Field(..., min_length=8, max_length=256)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=1, max_length=256)


# --- Vocabulary ---


class VocabularyBase(BaseModel):
    word: str = Field(..., max_length=200, examples=["der Hund"])
    translation: str = Field(..., max_length=200, examples=["the dog"])
    example: str | None = Field(None, examples=["Der Hund ist groß."])
    tags: str | None = Field(None, max_length=500, examples=["animals,A1"])


class VocabularyCreate(VocabularyBase):
    deck_id: int | None = None


class VocabularyUpdate(BaseModel):
    word: str | None = Field(None, max_length=200)
    translation: str | None = Field(None, max_length=200)
    example: str | None = None
    tags: str | None = Field(None, max_length=500)
    important: bool | None = None
    deck_id: int | None = None


class BulkDeleteIds(BaseModel):
    ids: list[int] = Field(..., min_length=1)


class VocabularyRead(VocabularyBase):
    id: int
    correct_count: int
    wrong_count: int
    weight: float
    important: bool
    deck_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VocabularyDeckBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class VocabularyDeckCreate(VocabularyDeckBase):
    pass


class VocabularyDeckUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class VocabularyDeckRead(VocabularyDeckBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Grammar ---


class GrammarRuleBase(BaseModel):
    title: str = Field(..., max_length=300, examples=["Akkusativ"])
    content: str = Field(..., examples=["The accusative case is used for direct objects..."])
    tags: str | None = Field(None, max_length=500, examples=["cases,A2"])


class GrammarRuleCreate(GrammarRuleBase):
    pass


class GrammarRuleUpdate(BaseModel):
    title: str | None = Field(None, max_length=300)
    content: str | None = None
    tags: str | None = Field(None, max_length=500)


class GrammarRuleRead(GrammarRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Flashcard ---


class FlashcardQuestion(BaseModel):
    vocabulary_id: int
    word: str
    translation: str
    prompt: str
    example: str | None = None


class FlashcardAnswer(BaseModel):
    vocabulary_id: int
    answer: str


class FlashcardResult(BaseModel):
    vocabulary_id: int
    word: str
    correct_answer: str
    your_answer: str
    is_correct: bool
    correct_count: int
    wrong_count: int


# --- Chat ---


class ChatMessage(BaseModel):
    role: str = Field(..., examples=["user"])
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    deck_id: int | None = Field(
        None,
        description="Target deck for words added via add_to_vocabulary from this chat; omit or null for without deck.",
    )


class ChatResponse(BaseModel):
    reply: str
