from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.models import User
from app.schemas.user import UserCreate, UserOut, UserUpdate, _validate_password_strength
from app.services import user_service

router = APIRouter()


class SelfUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_password_strength(v)
        return v


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=sorted({r.name for r in user.roles}),
        permissions=sorted({p.name for r in user.roles for p in r.permissions}),
    )


@router.put("/me", response_model=UserOut)
def update_me(
    data: SelfUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Permite que o próprio usuário atualize nome e senha."""
    u = user_service.update_user(
        db,
        user,
        full_name=data.full_name,
        password=data.password,
        current_user=user,
        request=request,
    )
    return UserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        roles=sorted({r.name for r in u.roles}),
        permissions=sorted({p.name for r in u.roles for p in r.permissions}),
    )


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_permission("users:read")),
):
    users = user_service.list_users(db)
    return [
        UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            roles=sorted({r.name for r in u.roles}),
            permissions=sorted({p.name for r in u.roles for p in r.permissions}),
        )
        for u in users
    ]


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("users:read")),
):
    u = user_service.get_user_or_404(db, user_id)
    return UserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        roles=sorted({r.name for r in u.roles}),
        permissions=sorted({p.name for r in u.roles for p in r.permissions}),
    )


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:create")),
):
    u = user_service.create_user(
        db,
        email=data.email,
        full_name=data.full_name,
        password=data.password,
        is_active=data.is_active,
        role_ids=data.role_ids,
        current_user=current_user,
        request=request,
    )
    return UserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        roles=sorted({r.name for r in u.roles}),
        permissions=sorted({p.name for r in u.roles for p in r.permissions}),
    )


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:update")),
):
    user = user_service.get_user_or_404(db, user_id)
    u = user_service.update_user(
        db,
        user,
        full_name=data.full_name,
        is_active=data.is_active,
        password=data.password,
        role_ids=data.role_ids,
        current_user=current_user,
        request=request,
    )
    return UserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        roles=sorted({r.name for r in u.roles}),
        permissions=sorted({p.name for r in u.roles for p in r.permissions}),
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:delete")),
):
    user = user_service.get_user_or_404(db, user_id)
    user_service.delete_user(db, user, current_user=current_user, request=request)
