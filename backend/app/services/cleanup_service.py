"""
Job periódico para remover refresh tokens expirados e revogados,
e purgar audit logs antigos.
Evita crescimento indefinido das tabelas refresh_tokens e audit_logs.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, delete, or_
from sqlalchemy.orm import Session

from app.models import RefreshToken
from app.services.audit_service import purge_old_audit_logs

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

    purge_count = purge_old_audit_logs(db)
    logger.info("Audit log purge concluído: %s registros removidos", purge_count)

    return count
