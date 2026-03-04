from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import (
    create_access_token,
    generate_refresh_token,
    refresh_token_expires_at,
    verify_password,
)
from app.models import RefreshToken, Role, User


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.execute(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    ).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str]:
    raw_refresh = generate_refresh_token()
    rt = RefreshToken(
        token_id=raw_refresh,
        user_id=user.id,
        expires_at=refresh_token_expires_at(),
        revoked=False,
    )
    db.add(rt)
    db.commit()
    access_token = create_access_token(user.email)
    return access_token, raw_refresh


def rotate_refresh_token(db: Session, token_id: str) -> tuple[str, str]:
    rt = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == token_id)
    ).scalar_one_or_none()

    if not rt or rt.revoked:
        raise ValueError("Refresh token inválido ou revogado")
    if rt.expires_at < datetime.now(timezone.utc):
        rt.revoked = True
        db.commit()
        raise ValueError("Refresh token expirado")

    rt.revoked = True

    user = db.execute(
        select(User)
        .where(User.id == rt.user_id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    ).scalar_one_or_none()

    if not user or not user.is_active:
        raise ValueError("Usuário inativo ou não encontrado")

    return issue_tokens(db, user)


def revoke_refresh_token(db: Session, token_id: str) -> None:
    rt = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == token_id)
    ).scalar_one_or_none()
    if rt:
        rt.revoked = True
        db.commit()
