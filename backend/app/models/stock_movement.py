import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MovementType(str, enum.Enum):
    RECEIPT = "RECEIPT"
    PRODUCTION_OUTPUT = "PRODUCTION_OUTPUT"
    TRANSFER = "TRANSFER"
    SALE = "SALE"
    ADJUSTMENT = "ADJUSTMENT"


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    piece_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("produced_pieces.id"), nullable=True)
    coil_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("coils.id"), nullable=True)
    transfer_group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    movement_type: Mapped[MovementType] = mapped_column(Enum(MovementType, name="movement_type"))
    from_warehouse_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("warehouses.id"), nullable=True)
    to_warehouse_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("warehouses.id"), nullable=True)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
