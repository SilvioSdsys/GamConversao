from fastapi import FastAPI

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.rbac_middleware import RBACMiddleware
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User

settings = get_settings()
app = FastAPI(title=settings.project_name)

ROUTE_PERMISSIONS = {
    ("GET", f"{settings.api_v1_prefix}/users/me"): "users:read:self",
}

app.add_middleware(RBACMiddleware, route_permissions=ROUTE_PERMISSIONS)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin_permission = db.query(Permission).filter_by(name="users:read:self").first()
        if not admin_permission:
            admin_permission = Permission(
                name="users:read:self", description="Read own user profile"
            )
            db.add(admin_permission)
            db.flush()

        admin_role = db.query(Role).filter_by(name="admin").first()
        if not admin_role:
            admin_role = Role(name="admin", description="Default administrator")
            admin_role.permissions.append(admin_permission)
            db.add(admin_role)
            db.flush()

        admin_user = db.query(User).filter_by(username="admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                is_active=True,
            )
            admin_user.roles.append(admin_role)
            db.add(admin_user)

        db.commit()
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}
