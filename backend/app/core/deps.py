from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.services.user_service import UserService
from app.services.rbac_service import get_user_permissions


def get_current_user(request: Request, db: Session = Depends(get_db)):
    if getattr(request.state, "user", None) is not None:
        return request.state.user

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = auth_header.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        username = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = UserService(db).get_by_username(username)
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    request.state.user = user
    return user


def require_permission(permission: str):
    def checker(request: Request, user=Depends(get_current_user)):
        if getattr(request.state, "permissions", None) is None:
            request.state.permissions = get_user_permissions(user)

        perms: set[str] = request.state.permissions

        # se no futuro você quiser superuser/wildcard, pode acrescentar aqui
        if permission not in perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        return user

    return checker
