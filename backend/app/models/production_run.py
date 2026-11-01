import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProductionRunStatus(str, enum.Enum):
    OPEN = "OPEN"
    COMPLETED = "COMPLETED"


class ProductionRun(Base):
    __tablename__ = "production_runs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coil_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coils.id"))
    machine_type: Mapped[str] = mapped_column(String(100))
    operator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[ProductionRunStatus] = mapped_column(Enum(ProductionRunStatus, name="production_run_status"), default=ProductionRunStatus.OPEN)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

