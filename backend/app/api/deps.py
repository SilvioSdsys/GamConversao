from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.services.user_service import UserService


def get_current_user(request: Request, db: Session = Depends(get_db)):
    # Se algum middleware já colocou o user no request.state, reaproveita
    if getattr(request.state, "user", None) is not None:
        return request.state.user

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = auth_header.replace("Bearer ", "", 1)

    try:
        username = decode_access_token(token)  # no seu projeto isso retorna username
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = UserService(db).get_by_username(username)
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # cache no request para outras dependências na mesma request
    request.state.user = user
    return user


def _get_user_permissions(user) -> set[str]:
    """
    Coleta permissões via relação roles -> permissions.
    Ajuste aqui se seu projeto usa outro formato.
    """
    perms: set[str] = set()

    # superuser ganha wildcard
    if getattr(user, "is_superuser", False):
        perms.add("admin.*")

    for role in getattr(user, "roles", []) or []:
        for perm in getattr(role, "permissions", []) or []:
            name = getattr(perm, "name", None)
            if name:
                perms.add(name)

    return perms


def require_permission(permission: str):
    """
    Dependency para usar nos endpoints:
      _ = Depends(require_permission("user.read"))
    """
    def checker(request: Request, user=Depends(get_current_user)):
        # cache permissões no request.state para não recalcular
        if getattr(request.state, "permissions", None) is None:
            request.state.permissions = _get_user_permissions(user)

        perms: set[str] = request.state.permissions

        # aceita wildcard do admin
        if permission not in perms and "admin.*" not in perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        return user

    return checker
