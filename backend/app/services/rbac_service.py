from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Permission, Role, User

DEFAULT_PERMISSIONS = {
    # Users
    "users:create": "Criar usuários",
    "users:read": "Listar e visualizar usuários",
    "users:update": "Atualizar usuários",
    "users:delete": "Remover usuários",

    # Roles
    "roles:create": "Criar perfis (roles)",
    "roles:read": "Listar e visualizar perfis (roles)",
    "roles:update": "Atualizar perfis (roles)",
    "roles:delete": "Remover perfis (roles)",

    # Permissions
    "permissions:create": "Criar permissões",
    "permissions:read": "Listar e visualizar permissões",
    "permissions:update": "Atualizar permissões",
    "permissions:delete": "Remover permissões",
}


def ensure_base_rbac(db: Session) -> None:
    permissions = db.execute(select(Permission)).scalars().all()
    existing = {permission.name for permission in permissions}

    for name, description in DEFAULT_PERMISSIONS.items():
        if name not in existing:
            db.add(Permission(name=name, description=description))

    db.flush()

    admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", description="Administrador com acesso total")
        db.add(admin_role)
        db.flush()

    # Admin tem TODAS as permissões existentes
    admin_role.permissions = db.execute(select(Permission)).scalars().all()
    db.commit()


def get_user_permissions(user: User) -> set[str]:
    permissions: set[str] = set()
    for role in getattr(user, "roles", []) or []:
        for permission in getattr(role, "permissions", []) or []:
            permissions.add(permission.name)
    return permissions
