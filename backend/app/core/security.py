from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

_MAX_PASSWORD_BYTES = 72  # Limite interno do bcrypt


def _prepare_password(password: str) -> bytes:
    pwd_bytes = password.encode("utf-8")
    return pwd_bytes[:_MAX_PASSWORD_BYTES]


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare_password(plain), hashed.encode("utf-8"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt()).decode("utf-8")


def create_access_token(subject: str) -> str:
    """
    Gera um JWT de acesso.
    - sub: email do usuário
    - jti: ID único do token (usado para blacklist futura)
    - type: 'access' (impede uso de refresh token como access)
    - iss: issuer da aplicação
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "jti": str(uuid4()),
        "type": "access",
        "iss": settings.project_name,
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """
    Decodifica e valida um access token.
    Retorna o payload completo para permitir verificação futura de jti.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise ValueError("Token inválido ou expirado") from exc

    if payload.get("type") != "access":
        raise ValueError("Tipo de token inválido")

    if not payload.get("sub"):
        raise ValueError("Token sem subject")

    return payload


def generate_refresh_token() -> str:
    """Gera um UUID v4 opaco para uso como refresh token."""
    return str(uuid4())


def refresh_token_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
