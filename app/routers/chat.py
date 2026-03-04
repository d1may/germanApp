import json

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import GrammarRule, Vocabulary
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT_TEMPLATE = """\
You are a helpful German language tutor. Use the student's vocabulary and grammar \
knowledge below to personalize your responses. Prefer using words and grammar they \
are currently learning. Correct mistakes gently and explain in English.

When the user asks to add a word to their dictionary (e.g. "add X to my vocabulary", \
"add X = Y to the dictionary", "добавь в словарь"), use the add_to_vocabulary tool \
to save it. Confirm after adding.

=== VOCABULARY ({vocab_count} words) ===
{vocab_block}

=== GRAMMAR RULES ({grammar_count} rules) ===
{grammar_block}
"""

ADD_TO_VOCABULARY_TOOL = {
    "type": "function",
    "function": {
        "name": "add_to_vocabulary",
        "description": "Add a new German word with its translation to the student's vocabulary. Use when the user asks to add, save, or remember a word.",
        "parameters": {
            "type": "object",
            "properties": {
                "word": {"type": "string", "description": "The German word"},
                "translation": {"type": "string", "description": "The English translation"},
                "example": {"type": "string", "description": "Optional example sentence in German"},
                "tags": {"type": "string", "description": "Optional comma-separated tags (e.g. A1, verbs)"},
            },
            "required": ["word", "translation"],
        },
    },
}


def _build_system_prompt(db: Session) -> str:
    vocab_list = db.scalars(select(Vocabulary)).all()
    grammar_list = db.scalars(select(GrammarRule)).all()

    vocab_lines = [
        f"- {v.word} = {v.translation}" + (f"  (e.g. {v.example})" if v.example else "")
        for v in vocab_list
    ]
    grammar_lines = [
        f"### {g.title}\n{g.content}" for g in grammar_list
    ]

    return SYSTEM_PROMPT_TEMPLATE.format(
        vocab_count=len(vocab_list),
        vocab_block="\n".join(vocab_lines) or "(none yet)",
        grammar_count=len(grammar_list),
        grammar_block="\n\n".join(grammar_lines) or "(none yet)",
    )


def _execute_add_to_vocabulary(args: dict, db: Session) -> str:
    word = (args.get("word") or "").strip()
    translation = (args.get("translation") or "").strip()
    if not word or not translation:
        return "Error: word and translation are required."
    example = (args.get("example") or "").strip() or None
    tags = (args.get("tags") or "").strip() or None
    vocab = Vocabulary(word=word, translation=translation, example=example, tags=tags)
    db.add(vocab)
    db.commit()
    return f"Added: {word} = {translation}"


@router.post("/", response_model=ChatResponse)
def chat(body: ChatRequest, db: Session = Depends(get_db)):
    if not settings.openai_api_key:
        raise HTTPException(500, "OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    system_prompt = _build_system_prompt(db)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in body.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    max_tool_rounds = 3
    reply = None

    for _ in range(max_tool_rounds):
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=[ADD_TO_VOCABULARY_TOOL],
            tool_choice="auto",
        )
        msg = response.choices[0].message

        if msg.content:
            reply = msg.content
            break

        if not msg.tool_calls:
            break

        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments or "{}"}}
                for tc in msg.tool_calls
            ],
        })

        for tc in msg.tool_calls:
            if tc.function.name != "add_to_vocabulary":
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": "Unknown tool."})
                continue
            args = json.loads(tc.function.arguments or "{}")
            result = _execute_add_to_vocabulary(args, db)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    return ChatResponse(reply=reply or "Done.")
