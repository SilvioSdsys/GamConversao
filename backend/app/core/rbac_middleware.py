from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.services.user_service import UserService


class RBACMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, route_permissions: dict[tuple[str, str], str]):
        super().__init__(app)
        self.route_permissions = route_permissions

    async def dispatch(self, request: Request, call_next: Callable):
        required_permission = self.route_permissions.get(
            (request.method.upper(), request.url.path)
        )
        if not required_permission:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing bearer token"})

        token = auth_header.replace("Bearer ", "", 1)

        try:
            username = decode_access_token(token)
        except ValueError:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})

        db = SessionLocal()
        try:
            user_service = UserService(db)
            user = user_service.get_by_username(username)
            if not user:
                return JSONResponse(status_code=401, content={"detail": "User not found"})

            permissions = user_service.get_permission_names(user)
            request.state.user = user
            request.state.permissions = permissions

            if required_permission not in permissions:
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
        finally:
            db.close()

        return await call_next(request)
