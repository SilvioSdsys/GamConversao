"""Testes para audit logs."""
from sqlalchemy import select

from app.models.rbac import AuditLog


def test_audit_log_list_requires_auth(client):
    """Listagem de audit logs requer autenticação."""
    resp = client.get("/api/v1/audit-logs/")
    assert resp.status_code == 401


def test_audit_log_list_with_auth(client, auth_headers):
    """Listagem de audit logs com token retorna 200."""
    resp = client.get("/api/v1/audit-logs/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


def test_audit_log_created_on_login(client, db):
    """Login cria registro em AuditLog."""
    before = db.execute(select(AuditLog)).scalars().all()
    client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin@2025!"},
    )
    after = db.execute(select(AuditLog)).scalars().all()
    assert len(after) > len(before)
