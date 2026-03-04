from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User
from app.services.cleanup_service import cleanup_expired_tokens
from app.services.rbac_service import ensure_base_rbac


def _run_token_cleanup() -> None:
    db = SessionLocal()
    try:
        cleanup_expired_tokens(db)
    finally:
        db.close()


settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.project_name,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def healthcheck():
    return {"status": "ok", "environment": settings.environment}


@app.on_event("startup")
def startup_seed() -> None:
    """
    Seed inicial de dados.
    NÃO chama create_all() — o schema é gerenciado exclusivamente pelo Alembic.
    """
    db = SessionLocal()
    try:
        ensure_base_rbac(db)

        admin_role = db.execute(select(Role).where(Role.name == "admin")).scalar_one()

        admin_user = db.execute(
            select(User).where(User.email == settings.admin_email, User.deleted_at.is_(None))
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

    scheduler = BackgroundScheduler()
    scheduler.add_job(_run_token_cleanup, "interval", hours=24, id="token_cleanup")
    scheduler.start()