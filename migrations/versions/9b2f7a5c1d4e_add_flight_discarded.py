"""add flight discarded flag

Revision ID: 9b2f7a5c1d4e
Revises: 17f54c139679
Create Date: 2026-09-17 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9b2f7a5c1d4e'
down_revision: Union[str, Sequence[str], None] = '17f54c139679'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'flights',
        sa.Column('discarded', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.drop_index('flights_started_at_idx', table_name='flights')
    op.create_index(
        'flights_started_at_idx',
        'flights',
        ['started_at'],
        unique=False,
        postgresql_where=sa.text('NOT discarded'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('flights_started_at_idx', table_name='flights', postgresql_where=sa.text('NOT discarded'))
    op.create_index('flights_started_at_idx', 'flights', ['started_at'], unique=False)
    op.drop_column('flights', 'discarded')
