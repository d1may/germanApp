from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import GrammarRule, User
from app.schemas import GrammarRuleCreate, GrammarRuleRead, GrammarRuleUpdate

router = APIRouter(prefix="/grammar", tags=["grammar"])


@router.get("/", response_model=list[GrammarRuleRead])
def list_grammar_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tag: str | None = None,
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(GrammarRule).where(GrammarRule.user_id == user.id)
    if tag:
        stmt = stmt.where(GrammarRule.tags.contains(tag))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            GrammarRule.title.ilike(pattern) | GrammarRule.content.ilike(pattern)
        )
    stmt = stmt.order_by(GrammarRule.created_at.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.get("/count")
def grammar_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.scalar(
        select(func.count(GrammarRule.id)).where(GrammarRule.user_id == user.id)
    )
    return {"count": count}


@router.get("/{rule_id}", response_model=GrammarRuleRead)
def get_grammar_rule(rule_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.get(GrammarRule, rule_id)
    if not rule or rule.user_id != user.id:
        raise HTTPException(404, "Grammar rule not found")
    return rule


@router.post("/", response_model=GrammarRuleRead, status_code=201)
def create_grammar_rule(data: GrammarRuleCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = GrammarRule(user_id=user.id, **data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/{rule_id}", response_model=GrammarRuleRead)
def update_grammar_rule(
    rule_id: int,
    data: GrammarRuleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.get(GrammarRule, rule_id)
    if not rule or rule.user_id != user.id:
        raise HTTPException(404, "Grammar rule not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
def delete_grammar_rule(rule_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.get(GrammarRule, rule_id)
    if not rule or rule.user_id != user.id:
        raise HTTPException(404, "Grammar rule not found")
    db.delete(rule)
    db.commit()
