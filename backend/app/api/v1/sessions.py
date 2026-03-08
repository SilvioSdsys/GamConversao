"""API de gerenciamento de sessões."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.db.session import get_db
from app.models import User
from app.models.rbac import RefreshToken
from app.services import audit_service
from app.services.session_service import (
    get_all_sessions,
    get_user_sessions,
    revoke_session,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionOut(BaseModel):
    token_id: str
    user_id: int
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_name: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    items: list[SessionOut]
    total: int


@router.get("/", response_model=SessionListResponse)
def list_my_sessions(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lista as sessões ativas do usuário autenticado."""
    sessions = get_user_sessions(db, user_id=user.id)
    items = [
        SessionOut(
            token_id=s.token_id,
            user_id=s.user_id,
            user_email=user.email,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            device_name=s.device_name,
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in sessions
    ]
    return SessionListResponse(items=items, total=len(items))


@router.get("/all", response_model=SessionListResponse)
def list_all_sessions(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_permission("sessions:read")),
):
    """Lista todas as sessões ativas (requer sessions:read)."""
    sessions, total = get_all_sessions(db, skip=skip, limit=limit)
    user_ids = list({s.user_id for s in sessions})
    users_map = {
        u.id: u.email
        for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    }
    items = [
        SessionOut(
            token_id=s.token_id,
            user_id=s.user_id,
            user_email=users_map.get(s.user_id),
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            device_name=s.device_name,
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in sessions
    ]
    return SessionListResponse(items=items, total=total)


@router.delete("/{token_id}")
def revoke_session_endpoint(
    request: Request,
    token_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Revoga uma sessão do próprio usuário."""
    success = revoke_session(db, token_id=token_id, user=user, admin_override=False)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada ou já revogada",
        )
    audit_service.log_event(
        db,
        action="session.revoke",
        result="success",
        user_id=user.id,
        user_email=user.email,
        resource_type="session",
        resource_id=token_id,
        request=request,
    )
    db.commit()
    return {"ok": True, "message": "Sessão revogada."}


@router.delete("/admin/{token_id}")
def admin_revoke_session(
    request: Request,
    token_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("sessions:revoke")),
):
    """Revoga qualquer sessão (requer sessions:revoke)."""
    success = revoke_session(db, token_id=token_id, user=user, admin_override=True)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada ou já revogada",
        )
    audit_service.log_event(
        db,
        action="session.revoke.admin",
        result="success",
        user_id=user.id,
        user_email=user.email,
        resource_type="session",
        resource_id=token_id,
        request=request,
    )
    db.commit()
    return {"ok": True, "message": "Sessão revogada."}
