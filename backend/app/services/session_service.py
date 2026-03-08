"""Serviço de gerenciamento de sessões (RefreshToken)."""
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import RefreshToken, User


def get_user_sessions(db: Session, user_id: int) -> list[RefreshToken]:
    """Retorna todas as sessões ativas (não revogadas e não expiradas) do usuário."""
    now = datetime.now(timezone.utc)
    return list(
        db.scalars(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        ).all()
    )


def get_all_sessions(
    db: Session, skip: int = 0, limit: int = 50
) -> tuple[list[RefreshToken], int]:
    """Retorna sessões ativas do sistema com paginação."""
    now = datetime.now(timezone.utc)
    base = select(RefreshToken).where(
        RefreshToken.revoked.is_(False),
        RefreshToken.expires_at > now,
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = list(
        db.scalars(
            base.order_by(RefreshToken.created_at.desc()).offset(skip).limit(limit)
        ).all()
    )
    return rows, total


def revoke_session(
    db: Session,
    token_id: str,
    *,
    user: User,
    admin_override: bool = False,
) -> bool:
    """
    Revoga uma sessão pelo token_id (refresh token).
    Se admin_override=True, permite revogar sessão de qualquer usuário.
    Caso contrário, só revoga se a sessão pertencer ao user.
    Retorna True se revogou, False se não encontrou ou sem permissão.
    """
    rt: RefreshToken | None = db.scalar(
        select(RefreshToken).where(RefreshToken.token_id == token_id)
    )

    if not rt:
        return False

    if not admin_override and rt.user_id != user.id:
        return False

    rt.revoked = True
    return True
