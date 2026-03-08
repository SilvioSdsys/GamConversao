# app/api/v1/audit_logs.py

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.schemas.audit import AuditLogListResponse, AuditLogOut
from app.services.audit_service import list_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=AuditLogListResponse)
def get_audit_logs(
    user_id: Optional[int] = Query(None),
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_permission("audit:read")),
):
    items, total = list_audit_logs(
        db,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        result=result,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return AuditLogListResponse(
        items=[AuditLogOut.model_validate(x) for x in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/export")
def export_audit_logs_csv(
    user_id: Optional[int] = Query(None),
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_permission("audit:read")),
):
    """Exporta até 10.000 registros em CSV."""
    items, _ = list_audit_logs(
        db,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        result=result,
        date_from=date_from,
        date_to=date_to,
        skip=0,
        limit=10_000,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "id",
            "created_at",
            "user_id",
            "user_email",
            "action",
            "resource_type",
            "resource_id",
            "result",
            "ip_address",
            "detail",
        ]
    )
    for log in items:
        writer.writerow(
            [
                log.id,
                log.created_at.isoformat(),
                log.user_id,
                log.user_email,
                log.action,
                log.resource_type,
                log.resource_id,
                log.result,
                log.ip_address,
                log.detail,
            ]
        )

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )
