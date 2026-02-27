from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.models.refresh_token import RefreshToken

router = APIRouter()

ACCESS_MINUTES = 15
REFRESH_DAYS = 7


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


def _user_permissions(user: User) -> list[str]:
    perms: set[str] = set()
    # espera: user.roles e role.permissions existirem
    for role in getattr(user, "roles", []):
        for perm in getattr(role, "permissions", []):
            name = getattr(perm, "name", None)
            if name:
                perms.add(name)
    # superuser pode receber wildcard
    if getattr(user, "is_superuser", False):
        perms.add("admin.*")
    return sorted(perms)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user: User | None = (
        db.query(User).filter(User.username == data.username).first()
    )

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    perms = _user_permissions(user)
    access_token = create_access_token(str(user.id), perms)

    # refresh token opaco (string random)
    raw_refresh = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_DAYS)

    rt = RefreshToken(
        token=raw_refresh,
        user_id=user.id,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(rt)
    db.commit()

    return TokenOut(access_token=access_token, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    rt: RefreshToken | None = db.query(RefreshToken).filter(
        RefreshToken.token == data.refresh_token
    ).first()

    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if rt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token")

    user: User | None = db.query(User).filter(User.id == rt.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    # ROTACIONA refresh token (recomendado)
    rt.revoked = True

    new_refresh = secrets.token_urlsafe(64)
    new_expires = datetime.utcnow() + timedelta(days=REFRESH_DAYS)
    new_rt = RefreshToken(
        token=new_refresh,
        user_id=user.id,
        expires_at=new_expires,
        revoked=False,
    )
    db.add(new_rt)
    db.commit()

    perms = _user_permissions(user)
    access_token = create_access_token(str(user.id), perms)
    return TokenOut(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout")
def logout(data: LogoutIn, db: Session = Depends(get_db)):
    rt: RefreshToken | None = db.query(RefreshToken).filter(
        RefreshToken.token == data.refresh_token
    ).first()

    if rt:
        rt.revoked = True
        db.commit()

    return {"ok": True}
