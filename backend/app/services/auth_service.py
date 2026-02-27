from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User

settings = get_settings()


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate(self, username: str, password: str) -> User | None:
        query = (
            select(User)
            .where(User.username == username)
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )
        user = self.db.scalar(query)
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def create_token_pair(self, user: User) -> tuple[str, str]:
        access_token = create_access_token(user.username)
        refresh_token_value = generate_refresh_token()

        refresh_token = RefreshToken(
            token=refresh_token_value,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        )
        self.db.add(refresh_token)
        self.db.commit()

        return access_token, refresh_token_value

    def refresh_access_token(self, refresh_token_value: str) -> tuple[str, str] | None:
        refresh_token = self.db.scalar(
            select(RefreshToken)
            .where(RefreshToken.token == refresh_token_value)
            .options(selectinload(RefreshToken.user))
        )

        if not refresh_token or refresh_token.revoked:
            return None
        if refresh_token.expires_at < datetime.utcnow():
            refresh_token.revoked = True
            self.db.commit()
            return None

        refresh_token.revoked = True

        new_access = create_access_token(refresh_token.user.username)
        new_refresh_value = generate_refresh_token()
        new_refresh = RefreshToken(
            token=new_refresh_value,
            user_id=refresh_token.user_id,
            expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        )
        self.db.add(new_refresh)
        self.db.commit()

        return new_access, new_refresh_value

    def revoke_refresh_token(self, refresh_token_value: str) -> bool:
        refresh_token = self.db.scalar(
            select(RefreshToken).where(RefreshToken.token == refresh_token_value)
        )
        if not refresh_token:
            return False

        refresh_token.revoked = True
        self.db.commit()
        return True
