from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permission
from app.core.security import hash_password
from app.models.user import User

router = APIRouter()


class UserOut(BaseModel):
    id: int
    username: str
    email: str | None = None
    is_active: bool
    is_superuser: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: str | None = None
    password: str
    is_active: bool = True
    is_superuser: bool = False


class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None


@router.get("/me")
def me(user=Depends(get_current_user)):
    # devolve também roles/perms, se existirem
    roles = [r.name for r in getattr(user, "roles", [])]
    perms = []
    for r in getattr(user, "roles", []):
        for p in getattr(r, "permissions", []):
            if p.name:
                perms.append(p.name)
    if getattr(user, "is_superuser", False) and "admin.*" not in perms:
        perms.append("admin.*")
    return {
        "id": user.id,
        "username": user.username,
        "email": getattr(user, "email", None),
        "is_active": user.is_active,
        "is_superuser": getattr(user, "is_superuser", False),
        "roles": sorted(set(roles)),
        "permissions": sorted(set(perms)),
    }


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_permission("user.read")),
):
    return db.query(User).order_by(User.id.asc()).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("user.read")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("user.create")),
):
    exists = db.query(User).filter(User.username == data.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        is_active=data.is_active,
        is_superuser=data.is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("user.update")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email is not None:
        user.email = data.email
    if data.password:
        user.password_hash = hash_password(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_superuser is not None:
        user.is_superuser = data.is_superuser

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("user.delete")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"ok": True}
