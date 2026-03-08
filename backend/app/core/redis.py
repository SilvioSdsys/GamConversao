"""Cliente Redis para blacklist de JWT e outros usos."""
from redis import Redis

from app.core.config import settings

_redis_client: Redis | None = None


def get_redis() -> Redis:
    """Retorna instância do cliente Redis conectada à URL configurada."""
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
    return _redis_client


def redis_ping() -> bool:
    """Verifica se o Redis está disponível."""
    try:
        r = get_redis()
        r.ping()
        return True
    except Exception:
        return False
