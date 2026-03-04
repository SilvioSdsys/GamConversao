"""initial auth schema (deprecated)

Revision ID: 20241201_000001
Revises: None
Create Date: 2024-12-01 00:00:01

AVISO: Esta migration original criava um conjunto antigo de tabelas
(users com username/password_hash, permissions, roles, etc.).
Esse schema foi substituído pelo schema canônico definido em
`20261101_0001_init_rbac.py`, então esta migration foi transformada
em NO-OP para evitar tabelas duplicadas.
"""

from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "20241201_000001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: schema canônico está em 20261101_0001_init_rbac."""
    pass


def downgrade() -> None:
    """No-op compatível (não recria o schema antigo)."""
    pass
