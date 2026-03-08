# app/schemas/audit.py

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    result: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    changes: Optional[dict] = None
    detail: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    skip: int
    limit: int
