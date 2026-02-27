from fastapi import FastAPI
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.auth_middleware import PermissionMiddleware
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User
from app.services.rbac_service import ensure_base_rbac

app = FastAPI(title=settings.APP_NAME)
app.add_middleware(PermissionMiddleware)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.on_event("startup")
def startup_seed() -> None:
    db = SessionLocal()
    try:
        ensure_base_rbac(db)
        admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one()
        admin_user = db.execute(select(User).where(User.email == settings.ADMIN_EMAIL)).scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                full_name="Administrator",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_active=True,
                roles=[admin_role],
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
