from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import Permission, User
from app.services import audit_service

router = APIRouter()


class PermissionOut(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class PermissionCreate(BaseModel):
    name: str
    description: str | None = None


class PermissionUpdate(BaseModel):
    description: str | None = None


@router.get("/", response_model=list[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    _=Depends(require_permission("permissions:read")),
):
    return db.execute(select(Permission).order_by(Permission.id.asc())).scalars().all()


@router.post("/", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
def create_permission(
    data: PermissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("permissions:create")),
):
    exists = db.execute(select(Permission).where(Permission.name == data.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Permission already exists")

    perm = Permission(name=data.name, description=data.description, created_by=current_user.id)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    audit_service.log_event(
        db, action="permission.create", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="permission", resource_id=perm.id,
        changes={"after": {"name": perm.name, "description": perm.description}},
        request=request,
    )
    db.commit()
    return perm


@router.put("/{permission_id}", response_model=PermissionOut)
def update_permission(
    permission_id: int,
    data: PermissionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("permissions:update")),
):
    perm = db.execute(select(Permission).where(Permission.id == permission_id)).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    before = {"name": perm.name, "description": perm.description}
    perm.description = data.description
    perm.updated_by = current_user.id
    db.commit()
    db.refresh(perm)
    after = {"name": perm.name, "description": perm.description}
    audit_service.log_event(
        db, action="permission.update", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="permission", resource_id=perm.id,
        changes={"before": before, "after": after},
        request=request,
    )
    db.commit()
    return perm


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("permissions:delete")),
):
    perm = db.execute(select(Permission).where(Permission.id == permission_id)).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    audit_service.log_event(
        db, action="permission.delete", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="permission", resource_id=permission_id,
        request=request,
    )
    db.delete(perm)
    db.commit()
    return {"ok": True}
