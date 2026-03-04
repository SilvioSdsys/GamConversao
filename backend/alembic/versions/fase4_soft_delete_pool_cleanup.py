"""fase4_soft_delete_pool_cleanup

Revision ID: fase4_001
Revises: 82c317380267
Create Date: 2026-03-04 (Fase 4)

Adiciona coluna deleted_at em users para soft delete.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "fase4_001"
down_revision: Union[str, None] = "82c317380267"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "deleted_at")
