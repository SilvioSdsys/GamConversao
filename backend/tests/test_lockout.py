"""Testes para bloqueio de conta (lockout)."""
from sqlalchemy import select

from app.core.config import get_settings
from app.models import User


def test_lockout_after_max_attempts(client, db):
    """Conta é bloqueada após account_lockout_attempts tentativas falhas."""
    settings = get_settings()
    max_attempts = settings.account_lockout_attempts

    for _ in range(max_attempts):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "wrong"},
        )
        assert resp.status_code in (401, 423)

    # Próximo login (mesmo com senha correta) deve retornar 423
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin@2025!"},
    )
    assert resp.status_code == 423
    assert "bloqueada" in resp.json()["detail"].lower()

    # Verificar que o usuário está locked no banco
    user = db.execute(
        select(User).where(User.email == "admin@test.com")
    ).scalar_one_or_none()
    assert user is not None
    assert user.locked_until is not None
