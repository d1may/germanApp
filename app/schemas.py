from datetime import datetime

from pydantic import BaseModel, Field


# --- Vocabulary ---


class VocabularyBase(BaseModel):
    word: str = Field(..., max_length=200, examples=["der Hund"])
    translation: str = Field(..., max_length=200, examples=["the dog"])
    example: str | None = Field(None, examples=["Der Hund ist groß."])
    tags: str | None = Field(None, max_length=500, examples=["animals,A1"])


class VocabularyCreate(VocabularyBase):
    pass


class VocabularyUpdate(BaseModel):
    word: str | None = Field(None, max_length=200)
    translation: str | None = Field(None, max_length=200)
    example: str | None = None
    tags: str | None = Field(None, max_length=500)


class VocabularyRead(VocabularyBase):
    id: int
    correct_count: int
    wrong_count: int
    weight: float
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


class ChatResponse(BaseModel):
    reply: str
