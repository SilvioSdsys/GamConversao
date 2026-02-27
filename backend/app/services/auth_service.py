from datetime import datetime, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models import RefreshToken, Role, User


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str]:
    access_token = create_access_token(str(user.id))
    refresh_token, expires_at, token_id = create_refresh_token(str(user.id))

    db.add(RefreshToken(token_id=token_id, user_id=user.id, expires_at=expires_at))
    db.commit()
    return access_token, refresh_token


def rotate_refresh_token(db: Session, token: str) -> tuple[str, str]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Tipo de token inválido")
        token_id = payload.get("jti")
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError) as exc:
        raise ValueError("Refresh token inválido") from exc

    token_row = db.execute(select(RefreshToken).where(RefreshToken.token_id == token_id)).scalar_one_or_none()
    if not token_row or token_row.revoked or token_row.expires_at < datetime.now(timezone.utc):
        raise ValueError("Refresh token expirado ou revogado")

    token_row.revoked = True

    user = db.execute(
        select(User).options(joinedload(User.roles).joinedload(Role.permissions)).where(User.id == user_id)
    ).unique().scalar_one_or_none()
    if not user:
        raise ValueError("Usuário não encontrado")

    access_token, refresh_token = issue_tokens(db, user)
    return access_token, refresh_token


def revoke_refresh_token(db: Session, token: str) -> None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_id = payload.get("jti")
    except JWTError:
        return

    token_row = db.execute(select(RefreshToken).where(RefreshToken.token_id == token_id)).scalar_one_or_none()
    if token_row:
        token_row.revoked = True
        db.commit()
