from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import (
    create_access_token,
    verify_password,
    generate_refresh_token,
    refresh_token_expires_at,
)
from app.core.audit import log_event
from app.models import User, RefreshToken
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


class LoginIn(BaseModel):
    """Aceita email ou username (ambos são usados como email para login)."""
    email: str | None = None
    username: str | None = None
    password: str

    @model_validator(mode="after")
    def require_email_or_username(self):
        if not self.email and not self.username:
            raise ValueError("Envie 'email' ou 'username'")
        return self

    def get_login_email(self) -> str:
        """E-mail a usar na busca (prioridade: email, depois username)."""
        return (self.email or self.username or "").strip()


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


def _load_user_permissions(user: User) -> list[str]:
    perms: set[str] = set()
    if getattr(user, "is_superuser", False):
        perms.add("admin:*")

    for role in getattr(user, "roles", []) or []:
        for perm in getattr(role, "permissions", []) or []:
            name = getattr(perm, "name", None)
            if name:
                perms.add(name)

    return sorted(perms)


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, data: LoginIn, db: Session = Depends(get_db)):
    from sqlalchemy import select

    email = data.get_login_email()
    user: User | None = db.execute(
        select(User).where(User.email == email, User.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not user or not getattr(user, "is_active", True):
        log_event(
            "login",
            "failure",
            ip=request.client.host if request.client else None,
            detail="invalid_credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.hashed_password):
        log_event(
            "login",
            "failure",
            user_id=user.id,
            ip=request.client.host if request.client else None,
            detail="invalid_credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(user.email)

    # Refresh token opaco salvo no banco
    raw_refresh = generate_refresh_token()
    expires_at = refresh_token_expires_at()

    rt = RefreshToken(
        token_id=raw_refresh,
        user_id=user.id,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(rt)
    db.commit()

    log_event(
        "login",
        "success",
        user_id=user.id,
        ip=request.client.host if request.client else None,
    )

    return TokenOut(access_token=access, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    from sqlalchemy import select

    rt: RefreshToken | None = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == data.refresh_token)
    ).scalar_one_or_none()

    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    now = datetime.now(timezone.utc)
    expires = rt.expires_at if rt.expires_at.tzinfo else rt.expires_at.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token")

    user: User | None = db.execute(
        select(User).where(User.id == rt.user_id)
    ).scalar_one_or_none()
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    # Rotação: revoga o refresh antigo e cria um novo
    rt.revoked = True
    new_refresh = generate_refresh_token()
    new_expires = refresh_token_expires_at()

    new_rt = RefreshToken(
        token_id=new_refresh,
        user_id=user.id,
        expires_at=new_expires,
        revoked=False,
    )
    db.add(new_rt)
    db.commit()

    access = create_access_token(user.email)
    return TokenOut(access_token=access, refresh_token=new_refresh)


@router.post("/logout")
def logout(data: LogoutIn, db: Session = Depends(get_db)):
    from sqlalchemy import select

    rt: RefreshToken | None = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == data.refresh_token)
    ).scalar_one_or_none()

    if rt:
        rt.revoked = True
        db.commit()

    return {"ok": True}
