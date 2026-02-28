from datetime import datetime

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
from app.models import User, RefreshToken

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
def login(data: LoginIn, db: Session = Depends(get_db)):
    user: User | None = db.query(User).filter(User.email == data.get_login_email()).first()

    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.hashed_password):
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

    return TokenOut(access_token=access, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    rt: RefreshToken | None = (
        db.query(RefreshToken).filter(RefreshToken.token_id == data.refresh_token).first()
    )

    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # expires_at pode ser timezone-aware ou naive dependendo do seu model/migration
    # aqui tratamos de forma simples:
    now = datetime.utcnow()
    if rt.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token")

    user: User | None = db.query(User).filter(User.id == rt.user_id).first()
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
    rt: RefreshToken | None = (
        db.query(RefreshToken).filter(RefreshToken.token_id == data.refresh_token).first()
    )

    if rt:
        rt.revoked = True
        db.commit()

    return {"ok": True}
