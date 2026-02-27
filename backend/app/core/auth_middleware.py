from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, User
from app.services.rbac_service import get_user_permissions


class PermissionMiddleware(BaseHTTPMiddleware):
    @staticmethod
    def _resolve_required_permissions(request: Request) -> set[str]:
        for route in request.app.router.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                endpoint = getattr(route, "endpoint", None)
                if endpoint:
                    return getattr(endpoint, "required_permissions", set())
        return set()

    async def dispatch(self, request: Request, call_next: Callable):
        required_permissions = self._resolve_required_permissions(request)

        if not required_permissions:
            return await call_next(request)

        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Token de acesso não fornecido"})

        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") != "access":
                raise JWTError("token type invalid")
            user_id = int(payload.get("sub"))
        except (JWTError, ValueError, TypeError):
            return JSONResponse(status_code=401, content={"detail": "Token inválido"})

        db = SessionLocal()
        try:
            user = db.execute(
                select(User).options(joinedload(User.roles).joinedload(Role.permissions)).where(User.id == user_id)
            ).unique().scalar_one_or_none()
            if not user or not user.is_active:
                return JSONResponse(status_code=401, content={"detail": "Usuário inválido"})

            user_permissions = get_user_permissions(user)
            if not required_permissions.issubset(user_permissions):
                return JSONResponse(status_code=403, content={"detail": "Permissão insuficiente"})

            request.state.current_user = user
            request.state.user_permissions = user_permissions
            return await call_next(request)
        finally:
            db.close()
