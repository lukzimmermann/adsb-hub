"""add users and group ownership

Revision ID: 33ca150e2c25
Revises: 1d308e7a2f98
Create Date: 2026-09-16 23:50:03.558365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33ca150e2c25'
down_revision: Union[str, Sequence[str], None] = '1d308e7a2f98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=100), nullable=False),
    sa.Column('password_hash', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('username')
    )
    # Nullable for now: existing aircraft_groups rows have no owner yet.
    # Backfill them, then a follow-up migration sets this NOT NULL.
    op.add_column('aircraft_groups', sa.Column('owner_user_id', sa.Integer(), nullable=True))
    op.drop_constraint('aircraft_groups_name_key', 'aircraft_groups', type_='unique')
    op.create_unique_constraint(
        'aircraft_groups_owner_user_id_name_key', 'aircraft_groups', ['owner_user_id', 'name']
    )
    op.create_foreign_key(
        'aircraft_groups_owner_user_id_fkey',
        'aircraft_groups', 'users', ['owner_user_id'], ['id'], ondelete='CASCADE',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('aircraft_groups_owner_user_id_fkey', 'aircraft_groups', type_='foreignkey')
    op.drop_constraint('aircraft_groups_owner_user_id_name_key', 'aircraft_groups', type_='unique')
    op.create_unique_constraint('aircraft_groups_name_key', 'aircraft_groups', ['name'])
    op.drop_column('aircraft_groups', 'owner_user_id')
    op.drop_table('users')
