from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import hash_password
from app.models import Role, User


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.execute(
        select(User)
        .where(User.id == user_id, User.deleted_at.is_(None))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


def get_by_email(db: Session, email: str) -> User | None:
    return db.execute(
        select(User)
        .where(User.email == email, User.deleted_at.is_(None))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    ).scalar_one_or_none()


def list_users(db: Session) -> list[User]:
    return db.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .order_by(User.id)
    ).scalars().all()


def create_user(
    db: Session,
    email: str,
    full_name: str,
    password: str,
    is_active: bool = True,
    role_ids: list[int] | None = None,
) -> User:
    if db.execute(select(User).where(User.email == email, User.deleted_at.is_(None))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    roles: list[Role] = []
    if role_ids:
        roles = db.execute(select(Role).where(Role.id.in_(role_ids))).scalars().all()

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        is_active=is_active,
        roles=roles,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user_or_404(db, user.id)


def update_user(
    db: Session,
    user: User,
    full_name: str | None = None,
    is_active: bool | None = None,
    password: str | None = None,
    role_ids: list[int] | None = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name
    if is_active is not None:
        user.is_active = is_active
    if password is not None:
        user.hashed_password = hash_password(password)
    if role_ids is not None:
        user.roles = (
            db.execute(select(Role).where(Role.id.in_(role_ids))).scalars().all()
            if role_ids
            else []
        )
    db.commit()
    return get_user_or_404(db, user.id)


def delete_user(db: Session, user: User) -> None:
    """Soft delete: marca deleted_at em vez de remover do banco."""
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
