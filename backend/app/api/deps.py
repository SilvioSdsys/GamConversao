from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Role, User
from app.services.jwt_blacklist_service import is_token_blacklisted

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revogado. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload["sub"]

    user = db.execute(
        select(User)
        .where(User.email == email, User.deleted_at.is_(None))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    ).scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo ou não encontrado",
        )

    return user


def require_permission(permission_name: str):
    """
    Dependência reutilizável para proteção por permissão.
    Uso: _=Depends(require_permission("users:read"))
    """

    def _check(user: User = Depends(get_current_user)) -> User:
        user_permissions = {
            perm.name
            for role in user.roles
            for perm in role.permissions
        }
        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão insuficiente: '{permission_name}' é necessária",
            )
        return user

    return _check
