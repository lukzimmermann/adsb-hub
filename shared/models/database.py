from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import (BigInteger, Column, DateTime, Float, ForeignKey, Index,
                        Integer, String, Table, Text, UniqueConstraint, func, text)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from shared.models.aircraft import Aircraft


class Base(DeclarativeBase):
    pass


group_registrations = Table(
    "group_registrations",
    Base.metadata,
    Column("group_id", ForeignKey("aircraft_groups.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "registration",
        ForeignKey("aircraft_registrations.registration", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    groups: Mapped[list["AircraftGroup"]] = relationship(back_populates="owner")


class AircraftGroup(Base):
    __tablename__ = "aircraft_groups"
    __table_args__ = (UniqueConstraint("owner_user_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    owner: Mapped[User] = relationship(back_populates="groups")
    registrations: Mapped[list["AircraftRegistration"]] = relationship(
        secondary=group_registrations,
        back_populates="groups",
        order_by="AircraftRegistration.registration",
    )


class AircraftRegistration(Base):
    __tablename__ = "aircraft_registrations"

    registration: Mapped[str] = mapped_column(String(32), primary_key=True)
    groups: Mapped[list[AircraftGroup]] = relationship(
        secondary=group_registrations,
        back_populates="registrations",
    )


class Airport(Base):
    __tablename__ = "airports"
    __table_args__ = (
        Index("airports_position_idx", "position", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    icao_code: Mapped[str | None] = mapped_column(String(4), unique=True)
    iata_code: Mapped[str | None] = mapped_column(String(3))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(2))
    position: Mapped[WKTElement] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)


class Flight(Base):
    __tablename__ = "flights"
    __table_args__ = (
        Index("flights_transponder_code_idx", "transponder_code"),
        Index("flights_started_at_idx", "started_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    transponder_code: Mapped[str] = mapped_column(Text, nullable=False)
    registration: Mapped[str | None] = mapped_column(Text)
    callsign: Mapped[str | None] = mapped_column(Text)
    aircraft_type: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    position_count: Mapped[int] = mapped_column(Integer, nullable=False)
    departure_airport_id: Mapped[int | None] = mapped_column(
        ForeignKey("airports.id", ondelete="SET NULL")
    )
    arrival_airport_id: Mapped[int | None] = mapped_column(
        ForeignKey("airports.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    departure_airport: Mapped[Airport | None] = relationship(foreign_keys=[departure_airport_id])
    arrival_airport: Mapped[Airport | None] = relationship(foreign_keys=[arrival_airport_id])
    positions: Mapped[list["AircraftPosition"]] = relationship(
        back_populates="flight", order_by="AircraftPosition.recorded_at"
    )


class AircraftPosition(Base):
    __tablename__ = "aircraft_positions"
    __table_args__ = (
        Index(
            "aircraft_positions_position_idx",
            "position",
            postgresql_using="gist",
        ),
        Index("aircraft_positions_recorded_at_idx", "recorded_at"),
        Index(
            "aircraft_positions_unclosed_idx",
            "transponder_code",
            "recorded_at",
            postgresql_where=text("flight_id IS NULL"),
        ),
        Index(
            "aircraft_positions_flight_id_idx",
            "flight_id",
            "recorded_at",
            postgresql_where=text("flight_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    transponder_code: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str | None] = mapped_column(Text)
    callsign: Mapped[str | None] = mapped_column(Text)
    registration: Mapped[str | None] = mapped_column(Text)
    aircraft_type: Mapped[str | None] = mapped_column(Text)
    position: Mapped[WKTElement] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    barometric_altitude: Mapped[str | None] = mapped_column(Text)
    geometric_altitude: Mapped[int | None] = mapped_column(Integer)
    altitude_m: Mapped[int | None] = mapped_column(Integer)
    ground_speed_knots: Mapped[float | None] = mapped_column(Float)
    track: Mapped[float | None] = mapped_column(Float)
    true_heading: Mapped[float | None] = mapped_column(Float)
    squawk_code: Mapped[str | None] = mapped_column(Text)
    emergency_status: Mapped[str | None] = mapped_column(Text)
    aircraft_category: Mapped[str | None] = mapped_column(Text)
    navigation_qnh: Mapped[float | None] = mapped_column(Float)
    selected_altitude: Mapped[int | None] = mapped_column(Integer)
    navigation_modes: Mapped[list[str] | None] = mapped_column(JSONB, default=list)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    navigation_integrity_category: Mapped[int | None] = mapped_column(Integer)
    radius_of_containment: Mapped[int | None] = mapped_column(Integer)
    seconds_since_position_update: Mapped[float | None] = mapped_column(Float)
    adsb_version: Mapped[int | None] = mapped_column(Integer)
    navigation_accuracy_position: Mapped[int | None] = mapped_column(Integer)
    navigation_accuracy_velocity: Mapped[int | None] = mapped_column(Integer)
    source_integrity_level: Mapped[int | None] = mapped_column(Integer)
    source_integrity_level_type: Mapped[str | None] = mapped_column(Text)
    system_design_assurance: Mapped[int | None] = mapped_column(Integer)
    alert_status: Mapped[int | None] = mapped_column(Integer)
    special_position_identification: Mapped[int | None] = mapped_column(Integer)
    multilateration_fields: Mapped[list[Any] | None] = mapped_column(JSONB, default=list)
    traffic_information_broadcast_fields: Mapped[list[Any] | None] = mapped_column(
        JSONB, default=list,
    )
    message_count: Mapped[int | None] = mapped_column(Integer)
    seconds_since_last_message: Mapped[float | None] = mapped_column(Float)
    signal_strength: Mapped[float | None] = mapped_column(Float)
    distance: Mapped[float | None] = mapped_column(Float)
    direction: Mapped[float | None] = mapped_column(Float)
    extra_properties: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=dict)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    flight_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("flights.id", ondelete="SET NULL")
    )
    flight: Mapped[Flight | None] = relationship(back_populates="positions")

    @classmethod
    def from_aircraft(cls, aircraft: Aircraft) -> "AircraftPosition":
        if aircraft.latitude is None or aircraft.longitude is None:
            raise ValueError("Aircraft must have latitude and longitude")
        if aircraft.transponder_code is None:
            raise ValueError("Aircraft must have a transponder code")

        return cls(
            transponder_code=aircraft.transponder_code,
            message_type=aircraft.message_type,
            callsign=aircraft.callsign,
            registration=aircraft.registration,
            aircraft_type=aircraft.aircraft_type,
            position=WKTElement(
                f"POINT({aircraft.longitude} {aircraft.latitude})",
                srid=4326,
            ),
            barometric_altitude=str(aircraft.barometric_altitude)
            if aircraft.barometric_altitude is not None
            else None,
            geometric_altitude=aircraft.geometric_altitude,
            altitude_m=aircraft.geometric_altitude,
            ground_speed_knots=aircraft.ground_speed,
            track=aircraft.track,
            true_heading=aircraft.true_heading,
            squawk_code=aircraft.squawk_code,
            emergency_status=aircraft.emergency_status,
            aircraft_category=aircraft.aircraft_category,
            navigation_qnh=aircraft.navigation_qnh,
            selected_altitude=aircraft.selected_altitude,
            navigation_modes=aircraft.navigation_modes,
            latitude=aircraft.latitude,
            longitude=aircraft.longitude,
            navigation_integrity_category=aircraft.navigation_integrity_category,
            radius_of_containment=aircraft.radius_of_containment,
            seconds_since_position_update=aircraft.seconds_since_position_update,
            adsb_version=aircraft.adsb_version,
            navigation_accuracy_position=aircraft.navigation_accuracy_position,
            navigation_accuracy_velocity=aircraft.navigation_accuracy_velocity,
            source_integrity_level=aircraft.source_integrity_level,
            source_integrity_level_type=aircraft.source_integrity_level_type,
            system_design_assurance=aircraft.system_design_assurance,
            alert_status=aircraft.alert_status,
            special_position_identification=aircraft.special_position_identification,
            multilateration_fields=aircraft.multilateration_fields,
            traffic_information_broadcast_fields=aircraft.traffic_information_broadcast_fields,
            message_count=aircraft.message_count,
            seconds_since_last_message=aircraft.seconds_since_last_message,
            signal_strength=aircraft.signal_strength,
            distance=aircraft.distance,
            direction=aircraft.direction,
            extra_properties=aircraft.extra_properties,
        )