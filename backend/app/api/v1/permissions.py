from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.models.permission import Permission

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
    _=Depends(require_permission("permission.read")),
):
    return db.query(Permission).order_by(Permission.id.asc()).all()


@router.post("/", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
def create_permission(
    data: PermissionCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("permission.create")),
):
    exists = db.query(Permission).filter(Permission.name == data.name).first()
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
    _=Depends(require_permission("permission.update")),
):
    perm = db.query(Permission).filter(Permission.id == permission_id).first()
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
    _=Depends(require_permission("permission.delete")),
):
    perm = db.query(Permission).filter(Permission.id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    db.delete(perm)
    db.commit()
    return {"ok": True}
