"""add flights and airports

Revision ID: 6e0c27b91207
Revises: b28dbf48b67e
Create Date: 2026-09-17 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6e0c27b91207'
down_revision: Union[str, Sequence[str], None] = 'b28dbf48b67e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Curated airports within/near the ~220km ADS-B reception radius
# (center 46.756467, 8.141683 per config.yaml). iata_code is left null
# for smaller regional/mountain airfields with no scheduled IATA code.
AIRPORT_SEED_DATA = [
    {"icao_code": "LSZH", "iata_code": "ZRH", "name": "Zürich Airport", "country_code": "CH", "latitude": 47.4647, "longitude": 8.5492},
    {"icao_code": "LSGG", "iata_code": "GVA", "name": "Genève Aéroport", "country_code": "CH", "latitude": 46.2381, "longitude": 6.1089},
    {"icao_code": "LSZB", "iata_code": "BRN", "name": "Bern-Belp Airport", "country_code": "CH", "latitude": 46.9141, "longitude": 7.4971},
    {"icao_code": "LSZA", "iata_code": "LUG", "name": "Lugano Airport", "country_code": "CH", "latitude": 46.0043, "longitude": 8.9105},
    {"icao_code": "LSGS", "iata_code": "SIR", "name": "Sion Airport", "country_code": "CH", "latitude": 46.2196, "longitude": 7.3267},
    {"icao_code": "LSZR", "iata_code": "ACH", "name": "St. Gallen-Altenrhein Airport", "country_code": "CH", "latitude": 47.4850, "longitude": 9.5606},
    {"icao_code": "LSZS", "iata_code": "SMV", "name": "Engadin Airport Samedan", "country_code": "CH", "latitude": 46.5339, "longitude": 9.8838},
    {"icao_code": "LSMD", "iata_code": None, "name": "Flugplatz Dübendorf", "country_code": "CH", "latitude": 47.3985, "longitude": 8.6483},
    {"icao_code": "LSZG", "iata_code": None, "name": "Flugplatz Grenchen", "country_code": "CH", "latitude": 47.1811, "longitude": 7.4172},
    {"icao_code": "LSMP", "iata_code": None, "name": "Flugplatz Payerne", "country_code": "CH", "latitude": 46.8433, "longitude": 6.9150},
    {"icao_code": "LSZL", "iata_code": None, "name": "Flugplatz Locarno", "country_code": "CH", "latitude": 46.1608, "longitude": 8.8794},
    {"icao_code": "LSTS", "iata_code": None, "name": "Flugplatz St. Stephan", "country_code": "CH", "latitude": 46.5083, "longitude": 7.4131},
    {"icao_code": "LSGK", "iata_code": None, "name": "Flugplatz Saanen", "country_code": "CH", "latitude": 46.4864, "longitude": 7.2528},
    {"icao_code": "LSZF", "iata_code": None, "name": "Flugplatz Birrfeld", "country_code": "CH", "latitude": 47.4394, "longitude": 8.2333},
    {"icao_code": "LSZK", "iata_code": None, "name": "Flugplatz Speck-Fehraltorf", "country_code": "CH", "latitude": 47.3919, "longitude": 8.7550},
    {"icao_code": "LSZC", "iata_code": None, "name": "Flugplatz Buochs", "country_code": "CH", "latitude": 46.9747, "longitude": 8.3958},
    {"icao_code": "LFSB", "iata_code": "BSL", "name": "EuroAirport Basel-Mulhouse-Freiburg", "country_code": "FR", "latitude": 47.5896, "longitude": 7.5296},
    {"icao_code": "EDNY", "iata_code": "FDH", "name": "Flughafen Friedrichshafen", "country_code": "DE", "latitude": 47.6713, "longitude": 9.5115},
    {"icao_code": "EDTD", "iata_code": None, "name": "Flugplatz Donaueschingen-Villingen", "country_code": "DE", "latitude": 47.9736, "longitude": 8.5228},
    {"icao_code": "LIMC", "iata_code": "MXP", "name": "Aeroporto di Milano Malpensa", "country_code": "IT", "latitude": 45.6306, "longitude": 8.7281},
    {"icao_code": "LFLB", "iata_code": "CMF", "name": "Aéroport de Chambéry-Savoie", "country_code": "FR", "latitude": 45.6381, "longitude": 5.8805},
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'airports',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('icao_code', sa.String(length=4), nullable=True),
        sa.Column('iata_code', sa.String(length=3), nullable=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=True),
        # Nullable for now: bulk_insert below only sets lat/lon, not the
        # geography point (no ST_MakePoint expression in a plain bulk
        # insert). Backfilled immediately after and set NOT NULL.
        sa.Column('position', geoalchemy2.types.Geography(geometry_type='POINT', srid=4326, dimension=2, spatial_index=False, from_text='ST_GeogFromText', name='geography', nullable=True), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('icao_code'),
    )
    op.create_index('airports_position_idx', 'airports', ['position'], unique=False, postgresql_using='gist')

    op.create_table(
        'flights',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('transponder_code', sa.Text(), nullable=False),
        sa.Column('registration', sa.Text(), nullable=True),
        sa.Column('callsign', sa.Text(), nullable=True),
        sa.Column('aircraft_type', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('position_count', sa.Integer(), nullable=False),
        sa.Column('departure_airport_id', sa.BigInteger(), nullable=True),
        sa.Column('arrival_airport_id', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['departure_airport_id'], ['airports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['arrival_airport_id'], ['airports.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('flights_transponder_code_idx', 'flights', ['transponder_code'], unique=False)
    op.create_index('flights_started_at_idx', 'flights', ['started_at'], unique=False)

    op.add_column('aircraft_positions', sa.Column('flight_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        'aircraft_positions_flight_id_fkey',
        'aircraft_positions', 'flights', ['flight_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index(
        'aircraft_positions_unclosed_idx',
        'aircraft_positions',
        ['transponder_code', 'recorded_at'],
        unique=False,
        postgresql_where=sa.text('flight_id IS NULL'),
    )

    airports_table = sa.table(
        'airports',
        sa.column('icao_code', sa.String),
        sa.column('iata_code', sa.String),
        sa.column('name', sa.Text),
        sa.column('country_code', sa.String),
        sa.column('latitude', sa.Float),
        sa.column('longitude', sa.Float),
    )
    op.bulk_insert(airports_table, AIRPORT_SEED_DATA)
    op.execute(
        "UPDATE airports SET position = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography "
        "WHERE position IS NULL"
    )
    op.alter_column('airports', 'position', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('aircraft_positions_unclosed_idx', table_name='aircraft_positions')
    op.drop_constraint('aircraft_positions_flight_id_fkey', 'aircraft_positions', type_='foreignkey')
    op.drop_column('aircraft_positions', 'flight_id')

    op.drop_index('flights_started_at_idx', table_name='flights')
    op.drop_index('flights_transponder_code_idx', table_name='flights')
    op.drop_table('flights')

    op.drop_index('airports_position_idx', table_name='airports', postgresql_using='gist')
    op.drop_table('airports')
