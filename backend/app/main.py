from fastapi import FastAPI
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User
from app.services.rbac_service import ensure_base_rbac

app = FastAPI(title=settings.APP_NAME)

# Rotas v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.on_event("startup")
def startup_seed() -> None:
    db = SessionLocal()
    try:
        # 1) Cria permissões base + role admin + dá todas permissões para admin
        ensure_base_rbac(db)

        # 2) Busca role admin
        admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one()

        # 3) Cria usuário admin (se não existir) e atribui role admin
        admin_user = db.execute(select(User).where(User.username == "admin")).scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                username="admin",
                email=getattr(settings, "ADMIN_EMAIL", "admin@example.com"),
                password_hash=hash_password(getattr(settings, "ADMIN_PASSWORD", "admin123")),
                is_active=True,
            )
            admin_user.roles.append(admin_role)
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
