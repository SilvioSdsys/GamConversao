from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import Permission

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
    db: Session = Depends(get_db),
    _=Depends(require_permission("permissions:create")),
):
    exists = db.execute(select(Permission).where(Permission.name == data.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Permission already exists")

    perm = Permission(name=data.name, description=data.description)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


@router.put("/{permission_id}", response_model=PermissionOut)
def update_permission(
    permission_id: int,
    data: PermissionUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("permissions:update")),
):
    perm = db.execute(select(Permission).where(Permission.id == permission_id)).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    perm.description = data.description
    db.commit()
    db.refresh(perm)
    return perm


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("permissions:delete")),
):
    perm = db.execute(select(Permission).where(Permission.id == permission_id)).scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    db.delete(perm)
    db.commit()
    return {"ok": True}
