from fastapi import APIRouter

from app.api.v1 import audit_logs, auth, users, roles, permissions, sessions

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sessions.router)
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(audit_logs.router)
