"""
Configuracao de testes. Variaveis de ambiente devem ser definidas ANTES de importar app.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "a" * 32)
os.environ.setdefault("ADMIN_EMAIL", "admin@test.com")
os.environ.setdefault("ADMIN_PASSWORD", "Admin@2025!")
os.environ.setdefault("CORS_ORIGINS", "http://test")

from app.core.config import get_settings

get_settings.cache_clear()

import pytest
import app.main  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import Permission, Role, User  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from unittest.mock import MagicMock, patch, AsyncMock  # noqa: E402

# Mock Redis para testes (evita conexao real)
_redis_mock = MagicMock()
_redis_mock.ping.return_value = True
_redis_mock.setex = MagicMock()
_redis_mock.exists.return_value = 0


@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis em todos os testes."""
    with patch("app.core.redis.get_redis", return_value=_redis_mock), patch(
        "app.services.jwt_blacklist_service.get_redis", return_value=_redis_mock
    ):
        yield _redis_mock


@pytest.fixture(autouse=True)
def disable_rate_limit():
    """Desabilita rate limit nos testes."""
    import app.main  # noqa: F401
    from app.api.v1 import auth

    app_limiter = app.main.app.state.limiter
    auth_limiter = auth.limiter
    orig_app, orig_auth = app_limiter.enabled, auth_limiter.enabled
    app_limiter.enabled = False
    auth_limiter.enabled = False
    yield
    app_limiter.enabled = orig_app
    auth_limiter.enabled = orig_auth


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _seed_db(db):
    """Seed manual: Permission, Role, User admin."""
    perms_data = [
        ("audit:read", "Visualizar logs de auditoria"),
        ("users:read", "Listar e visualizar usuarios"),
        ("sessions:read", "Listar sessoes ativas"),
        ("sessions:revoke", "Revogar sessoes"),
    ]
    for name, desc in perms_data:
        p = Permission(name=name, description=desc)
        db.add(p)
    db.flush()

    admin_role = Role(name="admin", description="Administrador")
    db.add(admin_role)
    db.flush()

    perms = db.execute(select(Permission)).scalars().all()
    admin_role.permissions = perms
    db.flush()

    admin_user = User(
        email="admin@test.com",
        full_name="Admin Test",
        hashed_password=hash_password("Admin@2025!"),
        is_active=True,
    )
    admin_user.roles.append(admin_role)
    db.add(admin_user)
    db.commit()


@pytest.fixture
def db():
    """Fixture de sessao de banco para testes."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Fixture de TestClient com get_db sobrescrito e seed."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.main.app.dependency_overrides[get_db] = override_get_db
    _seed_db(db)
    yield TestClient(app.main.app)
    app.main.app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    """Obtem access_token do admin via login."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin@2025!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Headers de autorizacao com Bearer token."""
    return {"Authorization": f"Bearer {admin_token}"}