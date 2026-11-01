import enum
import uuid

from sqlalchemy import Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WarehouseType(str, enum.Enum):
    MAIN = "MAIN"
    OUTLET = "OUTLET"


class Warehouse(Base):
    __tablename__ = "warehouses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    type: Mapped[WarehouseType] = mapped_column(Enum(WarehouseType, name="warehouse_type"))

