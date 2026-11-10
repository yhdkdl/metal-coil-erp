import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PieceStatus(str, enum.Enum):
    IN_MAIN = "IN_MAIN"
    IN_OUTLET = "IN_OUTLET"
    SOLD = "SOLD"


class ProducedPiece(Base):
    __tablename__ = "produced_pieces"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    piece_code: Mapped[str] = mapped_column(String(100), unique=True)
    parent_coil_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coils.id"))
    production_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("production_runs.id"), nullable=True)
    thickness_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    width_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    length_mm: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    grade: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(100))
    allocated_cost: Mapped[Decimal] = mapped_column(Numeric(16, 2))
    min_selling_price: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0.00"))
    selling_price: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    status: Mapped[PieceStatus] = mapped_column(Enum(PieceStatus, name="piece_status"), default=PieceStatus.IN_MAIN)
    current_warehouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("warehouses.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
