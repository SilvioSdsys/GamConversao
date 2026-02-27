from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Permission, Role, User

DEFAULT_PERMISSIONS = {
    "users:create": "Criar usuários",
    "users:read": "Listar e visualizar usuários",
    "users:update": "Atualizar usuários",
    "users:delete": "Remover usuários",
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

    admin_role.permissions = db.execute(select(Permission)).scalars().all()
    db.commit()


def get_user_permissions(user: User) -> set[str]:
    permissions: set[str] = set()
    for role in user.roles:
        for permission in role.permissions:
            permissions.add(permission.name)
    return permissions
