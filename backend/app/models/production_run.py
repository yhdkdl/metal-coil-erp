import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProductionRunStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ProductionRun(Base):
    __tablename__ = "production_runs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coil_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coils.id"))
    machine_type: Mapped[str] = mapped_column(String(100))
    operator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[ProductionRunStatus] = mapped_column(Enum(ProductionRunStatus, name="production_run_status"), default=ProductionRunStatus.OPEN)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProductionRunOutput(Base):
    __tablename__ = "production_run_outputs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    production_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("production_runs.id"), index=True)
    thickness_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    width_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    length_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    grade: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
