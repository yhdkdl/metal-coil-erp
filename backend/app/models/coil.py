import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Computed, DateTime, Enum, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CoilStatus(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    IN_PRODUCTION = "IN_PRODUCTION"
    CONSUMED = "CONSUMED"


class Coil(Base):
    __tablename__ = "coils"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coil_number: Mapped[str] = mapped_column(String(100), unique=True)
    heat_number: Mapped[str] = mapped_column(String(100))
    supplier: Mapped[str] = mapped_column(String(255))
    grade: Mapped[str] = mapped_column(String(100))
    thickness_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    width_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    total_weight_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    cost_per_kg: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(16, 2), Computed("total_weight_kg * cost_per_kg", persisted=True))
    status: Mapped[CoilStatus] = mapped_column(Enum(CoilStatus, name="coil_status"), default=CoilStatus.IN_STOCK)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
