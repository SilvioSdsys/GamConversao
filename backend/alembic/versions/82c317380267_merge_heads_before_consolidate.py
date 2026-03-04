"""merge_heads_before_consolidate

Revision ID: 82c317380267
Revises: 20241201_000001, 20261101_0001
Create Date: 2026-03-04 09:08:51.668141
"""

from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "82c317380267"
down_revision: Union[str, Sequence[str], None] = ("20241201_000001", "20261101_0001")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op merge revision."""
    pass


def downgrade() -> None:
    """No-op merge revision."""
    pass
