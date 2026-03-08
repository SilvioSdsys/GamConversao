# app/services/audit_service.py

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete, and_

from app.models.rbac import AuditLog
from app.core.config import settings


def _extract_ip(request) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if getattr(request, "client", None):
        return request.client.host
    return None


def _extract_ua(request) -> Optional[str]:
    if request is None:
        return None
    return (request.headers.get("User-Agent") or "")[:512]


def log_event(
    db: Session,
    *,
    action: str,
    result: str = "success",
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[Any] = None,
    changes: Optional[dict] = None,
    detail: Optional[str] = None,
    request=None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """
    Registra um evento de auditoria no banco.
    Pode receber ip/ua diretamente ou extrair do Request.
    """
    ip = ip_address or _extract_ip(request)
    ua = user_agent or _extract_ua(request)

    entry = AuditLog(
        action=action,
        result=result,
        user_id=user_id,
        user_email=user_email,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        changes=changes,
        detail=detail,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(entry)
    db.flush()
    return entry


def list_audit_logs(
    db: Session,
    *,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    result: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    """Retorna lista paginada e contagem total."""
    conditions = []

    if user_id is not None:
        conditions.append(AuditLog.user_id == user_id)
    if user_email:
        conditions.append(AuditLog.user_email.ilike(f"%{user_email}%"))
    if action:
        conditions.append(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if result:
        conditions.append(AuditLog.result == result)
    if date_from:
        conditions.append(AuditLog.created_at >= date_from)
    if date_to:
        conditions.append(AuditLog.created_at <= date_to)

    base = select(AuditLog)
    if conditions:
        base = base.where(and_(*conditions))

    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.scalars(
        base.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    ).all()

    return list(rows), total or 0


def purge_old_audit_logs(db: Session) -> int:
    """Remove audit logs mais antigos que AUDIT_LOG_RETENTION_DAYS. Retorna quantidade deletada."""
    retention_days = getattr(settings, "audit_log_retention_days", 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    result = db.execute(
        delete(AuditLog).where(AuditLog.created_at < cutoff)
    )
    db.commit()
    return result.rowcount or 0
