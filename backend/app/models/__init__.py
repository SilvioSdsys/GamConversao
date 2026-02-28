# Uma única fonte de verdade: rbac.py (evita tabelas duplicadas no MetaData do SQLAlchemy)
from app.models.rbac import (
    Permission,
    RefreshToken,
    Role,
    User,
    role_permissions,
    user_roles,
)

__all__ = [
    "User",
    "Role",
    "Permission",
    "RefreshToken",
    "user_roles",
    "role_permissions",
]
