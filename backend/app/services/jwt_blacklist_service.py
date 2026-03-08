"""Serviço de blacklist de tokens JWT via Redis."""
import time

from app.core.redis import get_redis

PREFIX = "jwt:blacklist:"


def blacklist_token(jti: str, exp: int) -> None:
    """
    Adiciona o JTI à blacklist até o momento de expiração do token.
    Usa TTL baseado em exp (timestamp Unix) para limpeza automática.
    """
    r = get_redis()
    key = f"{PREFIX}{jti}"
    # TTL em segundos: exp - now (mínimo 1 para não falhar)
    ttl = max(1, int(exp) - int(time.time()))
    r.setex(key, ttl, "1")


def is_token_blacklisted(jti: str) -> bool:
    """
    Verifica se o JTI está na blacklist.
    Retorna False em caso de falha no Redis (fail-open — token expira naturalmente).
    """
    try:
        r = get_redis()
        key = f"{PREFIX}{jti}"
        return bool(r.exists(key))
    except Exception:
        return False
