"""Testes para sessões."""
from sqlalchemy import select

from app.models import RefreshToken


def test_list_my_sessions_requires_auth(client):
    """Listar sessões requer autenticação."""
    resp = client.get("/api/v1/sessions/")
    assert resp.status_code == 401


def test_list_my_sessions_with_auth(client, auth_headers):
    """Listar sessões com token retorna 200."""
    resp = client.get("/api/v1/sessions/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


def test_logout_all_revokes_tokens(client, auth_headers, db):
    """logout-all revoga todas as sessões do usuário."""
    # Primeiro login cria uma sessão
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin@2025!"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    # Obter novo access_token para usar em logout-all
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Chamar logout-all usando a sessão do client (com token do login acima)
    resp = client.post("/api/v1/auth/logout-all", headers=headers)
    assert resp.status_code == 200

    # Verificar que o RefreshToken foi revogado
    rt = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == refresh_token)
    ).scalar_one_or_none()
    assert rt is not None
    assert rt.revoked is True
