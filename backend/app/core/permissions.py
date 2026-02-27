from collections.abc import Callable
from functools import wraps
from typing import Any


def require_permissions(*permissions: str):
    def decorator(func: Callable[..., Any]):
        setattr(func, "required_permissions", set(permissions))

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any):
            return await func(*args, **kwargs)

        setattr(wrapper, "required_permissions", set(permissions))
        return wrapper

    return decorator
