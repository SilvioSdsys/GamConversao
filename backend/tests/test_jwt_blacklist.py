"""Testes para blacklist de JWT."""
from unittest.mock import patch, MagicMock

import pytest

from app.services.jwt_blacklist_service import blacklist_token


def test_blacklist_token_calls_setex_with_value_1():
    """blacklist_token usa setex com valor '1', não 'revoked'."""
    mock_redis = MagicMock()

    with patch("app.services.jwt_blacklist_service.get_redis", return_value=mock_redis):
        blacklist_token(jti="test-jti-123", exp=9999999999)

    mock_redis.setex.assert_called_once()
    # setex(key, ttl, value) - o terceiro argumento deve ser "1"
    call_args = mock_redis.setex.call_args
    assert call_args[0][0] == "jwt:blacklist:test-jti-123"
    assert call_args[0][2] == "1"
