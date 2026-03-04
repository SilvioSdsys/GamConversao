"""
Job periódico para remover refresh tokens expirados e revogados.
Evita crescimento indefinido da tabela refresh_tokens.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, delete, or_
from sqlalchemy.orm import Session

from app.models import RefreshToken

logger = logging.getLogger(__name__)


def cleanup_expired_tokens(db: Session, older_than_days: int = 30) -> int:
    """
    Remove tokens que estão expirados OU revogados há mais de `older_than_days` dias.
    Retorna o número de tokens removidos.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=older_than_days)

    result = db.execute(
        delete(RefreshToken).where(
            or_(
                RefreshToken.expires_at < now,
                and_(RefreshToken.revoked.is_(True), RefreshToken.created_at < cutoff),
            )
        )
    )
    db.commit()
    count = result.rowcount if result.rowcount is not None else 0
    logger.info("cleanup_tokens: removidos %s tokens expirados/revogados", count)
    return count
