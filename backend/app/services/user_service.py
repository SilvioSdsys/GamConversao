from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models import Role, User
from app.schemas.user import UserCreate, UserUpdate


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.execute(
        select(User).options(joinedload(User.roles).joinedload(Role.permissions)).where(User.id == user_id)
    ).unique().scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


def list_users(db: Session) -> list[User]:
    return (
        db.execute(select(User).options(joinedload(User.roles).joinedload(Role.permissions)).order_by(User.id))
        .unique()
        .scalars()
        .all()
    )


def create_user(db: Session, payload: UserCreate) -> User:
    existing_user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    roles = []
    if payload.role_ids:
        roles = db.execute(select(Role).where(Role.id.in_(payload.role_ids))).scalars().all()

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=payload.is_active,
        roles=roles,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user_or_404(db, user.id)


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.role_ids is not None:
        roles = db.execute(select(Role).where(Role.id.in_(payload.role_ids))).scalars().all() if payload.role_ids else []
        user.roles = roles

    db.commit()
    db.refresh(user)
    return get_user_or_404(db, user.id)


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
