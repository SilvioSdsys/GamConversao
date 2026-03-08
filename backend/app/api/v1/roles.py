from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import Role, User
from app.services import audit_service

router = APIRouter()


class RoleOut(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    description: str | None = None


@router.get("/", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), _=Depends(require_permission("roles:read"))):
    return db.execute(select(Role).order_by(Role.id.asc())).scalars().all()


@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    data: RoleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles:create")),
):
    exists = db.execute(select(Role).where(Role.name == data.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Role already exists")

    role = Role(name=data.name, description=data.description, created_by=current_user.id)
    db.add(role)
    db.commit()
    db.refresh(role)
    audit_service.log_event(
        db, action="role.create", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="role", resource_id=role.id,
        changes={"after": {"name": role.name, "description": role.description}},
        request=request,
    )
    db.commit()
    return role


@router.put("/{role_id}", response_model=RoleOut)
def update_role(
    role_id: int,
    data: RoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles:update")),
):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    before = {"name": role.name, "description": role.description}
    role.description = data.description
    role.updated_by = current_user.id
    db.commit()
    db.refresh(role)
    after = {"name": role.name, "description": role.description}
    audit_service.log_event(
        db, action="role.update", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="role", resource_id=role.id,
        changes={"before": before, "after": after},
        request=request,
    )
    db.commit()
    return role


@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles:delete")),
):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    audit_service.log_event(
        db, action="role.delete", result="success",
        user_id=current_user.id, user_email=current_user.email,
        resource_type="role", resource_id=role_id,
        request=request,
    )
    db.delete(role)
    db.commit()
    return {"ok": True}
