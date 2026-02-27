from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.role import Role
from app.models.user import User


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(
            select(User)
            .where(User.username == username)
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )

    @staticmethod
    def get_permission_names(user: User) -> set[str]:
        permissions: set[str] = set()
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
        return permissions

    @staticmethod
    def get_role_names(user: User) -> list[str]:
        return sorted({role.name for role in user.roles})
