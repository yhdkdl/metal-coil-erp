import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceHistory(Base):
    __tablename__ = "price_history"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    piece_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("produced_pieces.id"))
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    new_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    changed_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
