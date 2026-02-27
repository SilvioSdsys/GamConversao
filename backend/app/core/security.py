from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(username: str) -> str:
    """
    Cria JWT de acesso com sub=username (compatível com decode_access_token()).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": username, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """
    Valida JWT e retorna username (sub).
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc

    if payload.get("type") != "access":
        raise ValueError("Invalid token type")

    username = payload.get("sub")
    if not username:
        raise ValueError("Invalid access token payload")

    return username


def generate_refresh_token() -> str:
    """
    Refresh token opaco (não-JWT) para armazenar no banco.
    """
    return str(uuid4())


def refresh_token_expires_at() -> datetime:
    """
    Calcula expiração do refresh token.
    """
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
