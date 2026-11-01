import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SaleType(str, enum.Enum):
    BULK = "BULK"
    RETAIL = "RETAIL"


class Sale(Base):
    __tablename__ = "sales"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_number: Mapped[str] = mapped_column(String(100), unique=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    sale_type: Mapped[SaleType] = mapped_column(Enum(SaleType, name="sale_type"))
    warehouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("warehouses.id"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(16, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

