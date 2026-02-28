from fastapi import FastAPI
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Role, User
from app.services.rbac_service import ensure_base_rbac

settings = get_settings()
app = FastAPI(title=settings.project_name)

# Rotas v1
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.on_event("startup")
def startup_seed() -> None:
    # ✅ Cria todas as tabelas (dev)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ✅ Cria permissões base + role admin + dá todas permissões ao admin
        ensure_base_rbac(db)

        admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one()

        # ✅ Cria admin se não existir e atribui role admin
        admin_user = db.execute(
            select(User).where(User.email == settings.admin_email)
        ).scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=settings.admin_email,
                full_name=settings.admin_full_name,
                hashed_password=hash_password(settings.admin_password),
                is_active=True,
            )
            admin_user.roles.append(admin_role)
            db.add(admin_user)
            db.commit()
    finally:
        db.close()