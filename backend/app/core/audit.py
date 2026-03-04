"""
Módulo de log de auditoria para operações sensíveis.
Registra: IP, user_id, ação, recurso, resultado, timestamp.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger("audit")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | AUDIT | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )
    logger.addHandler(handler)


def log_event(
    action: str,
    result: str,  # "success" | "failure"
    user_id: int | str | None = None,
    resource: str | None = None,
    ip: str | None = None,
    detail: str | None = None,
) -> None:
    msg_parts = [
        f"action={action}",
        f"result={result}",
        f"user_id={user_id or 'anonymous'}",
    ]
    if resource:
        msg_parts.append(f"resource={resource}")
    if ip:
        msg_parts.append(f"ip={ip}")
    if detail:
        msg_parts.append(f"detail={detail}")
    msg_parts.append(f"ts={datetime.now(timezone.utc).isoformat()}")
    logger.info(" | ".join(msg_parts))
