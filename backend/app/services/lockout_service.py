# app/services/lockout_service.py

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.rbac import User
from app.core.config import settings


MAX_ATTEMPTS: int = getattr(settings, "account_lockout_attempts", 5)
LOCKOUT_MINUTES: int = getattr(settings, "account_lockout_minutes", 15)


def check_and_apply_lockout(db: Session, user: User) -> bool:
    """
    Incrementa tentativas falhas. Bloqueia a conta se atingiu o limite.
    Retorna True se a conta está/ficou bloqueada.
    """
    if user.is_locked:
        return True

    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

    if user.failed_login_attempts >= MAX_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        db.flush()
        return True

    db.flush()
    return False


def reset_lockout(db: Session, user: User) -> None:
    """Limpa contadores após login bem-sucedido."""
    user.failed_login_attempts = 0
    user.locked_until = None
    db.flush()
