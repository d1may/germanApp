import json

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import GrammarRule, User, Vocabulary
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT_TEMPLATE = """\
You are a helpful German language tutor. Use the student's vocabulary and grammar \
knowledge below to personalize your responses. Prefer using words and grammar they \
are currently learning. Correct mistakes gently and explain in English.

When the user asks to add a word, use add_to_vocabulary. If the word already exists, \
the tool will tell you—inform the user and show the existing entry (e.g. "You already have: sein = to be"). \
When the user has a word with wrong translation and asks to fix it, use update_vocabulary.

For grammar: when the user asks to add or save a grammar rule, use add_grammar_rule. If a rule with that \
title exists, you will be told—inform the user. When they ask to edit or fix a rule, use update_grammar_rule.

=== VOCABULARY ({vocab_count} words) ===
{vocab_block}

=== GRAMMAR RULES ({grammar_count} rules) ===
{grammar_block}
"""

ADD_TO_VOCABULARY_TOOL = {
    "type": "function",
    "function": {
        "name": "add_to_vocabulary",
        "description": "Add a new German word with its translation to the student's vocabulary. Use when the user asks to add, save, or remember a word. If the word already exists, you will be told—inform the user and show the existing entry.",
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

UPDATE_VOCABULARY_TOOL = {
    "type": "function",
    "function": {
        "name": "update_vocabulary",
        "description": "Update an existing word in the student's vocabulary. Use when the user wants to fix or edit a word (e.g. wrong translation, add example). The word must already exist.",
        "parameters": {
            "type": "object",
            "properties": {
                "word": {"type": "string", "description": "The German word to update (must exist)"},
                "translation": {"type": "string", "description": "The new translation"},
                "example": {"type": "string", "description": "Optional example sentence"},
                "tags": {"type": "string", "description": "Optional comma-separated tags"},
            },
            "required": ["word", "translation"],
        },
    },
}

ADD_GRAMMAR_RULE_TOOL = {
    "type": "function",
    "function": {
        "name": "add_grammar_rule",
        "description": "Add a new grammar rule to the student's notes. Use when the user asks to add, save, or create a grammar rule. If a rule with that title exists, you will be told.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short title (e.g. Akkusativ, Perfekt)"},
                "content": {"type": "string", "description": "The rule explanation and examples"},
                "tags": {"type": "string", "description": "Optional comma-separated tags (e.g. cases, A2)"},
            },
            "required": ["title", "content"],
        },
    },
}

UPDATE_GRAMMAR_RULE_TOOL = {
    "type": "function",
    "function": {
        "name": "update_grammar_rule",
        "description": "Update an existing grammar rule. Use when the user wants to edit or fix a rule. Match by title.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the rule to update (must exist)"},
                "content": {"type": "string", "description": "The new rule content"},
                "tags": {"type": "string", "description": "Optional comma-separated tags"},
            },
            "required": ["title", "content"],
        },
    },
}


def _build_system_prompt(db: Session, *, user_id: int) -> str:
    vocab_list = db.scalars(
        select(Vocabulary).where(Vocabulary.user_id == user_id)
    ).all()
    grammar_list = db.scalars(
        select(GrammarRule).where(GrammarRule.user_id == user_id)
    ).all()

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


def _execute_add_to_vocabulary(args: dict, db: Session, *, user_id: int) -> str:
    word = (args.get("word") or "").strip()
    translation = (args.get("translation") or "").strip()
    if not word or not translation:
        return "Error: word and translation are required."
    # Check if word already exists (case-insensitive)
    existing = db.scalars(
        select(Vocabulary).where(
            Vocabulary.user_id == user_id,
            func.lower(func.trim(Vocabulary.word)) == word.strip().lower(),
        )
    ).first()
    if existing:
        return f"Already exists: {existing.word} = {existing.translation}" + (
            f" (e.g. {existing.example})" if existing.example else ""
        )
    example = (args.get("example") or "").strip() or None
    tags = (args.get("tags") or "").strip() or None
    vocab = Vocabulary(
        user_id=user_id,
        word=word,
        translation=translation,
        example=example,
        tags=tags,
    )
    db.add(vocab)
    db.commit()
    return f"Added: {word} = {translation}"


def _execute_update_vocabulary(args: dict, db: Session, *, user_id: int) -> str:
    word = (args.get("word") or "").strip()
    translation = (args.get("translation") or "").strip()
    if not word or not translation:
        return "Error: word and translation are required."
    existing = db.scalars(
        select(Vocabulary).where(
            Vocabulary.user_id == user_id,
            func.lower(func.trim(Vocabulary.word)) == word.strip().lower(),
        )
    ).first()
    if not existing:
        return f"Error: You don't have '{word}' in your vocabulary. Add it first."
    existing.translation = translation
    if "example" in args:
        existing.example = (args.get("example") or "").strip() or None
    if "tags" in args:
        existing.tags = (args.get("tags") or "").strip() or None
    db.commit()
    db.refresh(existing)
    return f"Updated: {existing.word} = {existing.translation}"


def _execute_add_grammar_rule(args: dict, db: Session, *, user_id: int) -> str:
    title = (args.get("title") or "").strip()
    content = (args.get("content") or "").strip()
    if not title or not content:
        return "Error: title and content are required."
    existing = db.scalars(
        select(GrammarRule).where(
            GrammarRule.user_id == user_id,
            func.lower(func.trim(GrammarRule.title)) == title.strip().lower(),
        )
    ).first()
    if existing:
        return f"Already exists: '{existing.title}'. Use update_grammar_rule to edit it."
    tags = (args.get("tags") or "").strip() or None
    rule = GrammarRule(user_id=user_id, title=title, content=content, tags=tags)
    db.add(rule)
    db.commit()
    return f"Added grammar rule: {title}"


def _execute_update_grammar_rule(args: dict, db: Session, *, user_id: int) -> str:
    title = (args.get("title") or "").strip()
    content = (args.get("content") or "").strip()
    if not title or not content:
        return "Error: title and content are required."
    existing = db.scalars(
        select(GrammarRule).where(
            GrammarRule.user_id == user_id,
            func.lower(func.trim(GrammarRule.title)) == title.strip().lower(),
        )
    ).first()
    if not existing:
        return f"Error: You don't have a rule titled '{title}'. Add it first."
    existing.content = content
    if "tags" in args:
        existing.tags = (args.get("tags") or "").strip() or None
    db.commit()
    db.refresh(existing)
    return f"Updated grammar rule: {existing.title}"


@router.post("/", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.openai_api_key:
        raise HTTPException(500, "OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    system_prompt = _build_system_prompt(db, user_id=user.id)

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
            tools=[
                ADD_TO_VOCABULARY_TOOL,
                UPDATE_VOCABULARY_TOOL,
                ADD_GRAMMAR_RULE_TOOL,
                UPDATE_GRAMMAR_RULE_TOOL,
            ],
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
            args = json.loads(tc.function.arguments or "{}")
            if tc.function.name == "add_to_vocabulary":
                result = _execute_add_to_vocabulary(args, db, user_id=user.id)
            elif tc.function.name == "update_vocabulary":
                result = _execute_update_vocabulary(args, db, user_id=user.id)
            elif tc.function.name == "add_grammar_rule":
                result = _execute_add_grammar_rule(args, db, user_id=user.id)
            elif tc.function.name == "update_grammar_rule":
                result = _execute_update_grammar_rule(args, db, user_id=user.id)
            else:
                result = "Unknown tool."
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    return ChatResponse(reply=reply or "Done.")
