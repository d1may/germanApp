from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_exp_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")


@router.post("/register", response_model=UserRead, status_code=201)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.username == body.username))
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")
    if body.email:
        exists_email = db.scalar(select(User).where(User.email == body.email))
        if exists_email:
            raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/login", response_model=UserRead)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token(user_id=user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    _clear_auth_cookie(response)
    return None


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user

