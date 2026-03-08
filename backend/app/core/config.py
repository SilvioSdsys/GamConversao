from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Aplicação ──────────────────────────────────────────────
    project_name: str = "GAM-inspired Auth"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"  # development | production | testing

    # ── Banco de Dados ─────────────────────────────────────────
    database_url: str  # OBRIGATÓRIO — sem default

    # ── JWT ────────────────────────────────────────────────────
    jwt_secret_key: str  # OBRIGATÓRIO — sem default
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Admin inicial ──────────────────────────────────────────
    admin_email: str  # OBRIGATÓRIO — sem default
    admin_password: str  # OBRIGATÓRIO — sem default
    admin_full_name: str = "Administrador"

    # ── CORS ───────────────────────────────────────────────────
    # Em produção, liste as origens exatas: "https://app.empresa.com,https://admin.empresa.com"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # ── Redis ──────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Bloqueio de conta e Audit Log ──────────────────────────
    account_lockout_attempts: int = 5
    account_lockout_minutes: int = 15
    audit_log_retention_days: int = 90

    @field_validator("jwt_secret_key")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY deve ter pelo menos 32 caracteres")
        return v

    @field_validator("admin_password")
    @classmethod
    def admin_password_must_be_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("ADMIN_PASSWORD deve ter pelo menos 8 caracteres")
        return v

    @field_validator("environment")
    @classmethod
    def environment_must_be_valid(cls, v: str) -> str:
        if v not in ("development", "production", "testing"):
            raise ValueError("ENVIRONMENT deve ser: development, production ou testing")
        return v

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Atalho usado em alguns módulos como `from app.core.config import settings`
settings = get_settings()
