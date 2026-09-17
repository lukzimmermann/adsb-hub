"""add flight_id index on aircraft_positions

Revision ID: 17f54c139679
Revises: 6e0c27b91207
Create Date: 2026-09-17 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '17f54c139679'
down_revision: Union[str, Sequence[str], None] = '6e0c27b91207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Complements aircraft_positions_unclosed_idx (WHERE flight_id IS NULL):
    # this one serves lookups of an already-closed flight's positions
    # (flight detail API, airport-recalculation), which were previously
    # unindexed and fell back to a full-table scan per flight.
    op.create_index(
        'aircraft_positions_flight_id_idx',
        'aircraft_positions',
        ['flight_id', 'recorded_at'],
        unique=False,
        postgresql_where=sa.text('flight_id IS NOT NULL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('aircraft_positions_flight_id_idx', table_name='aircraft_positions')
