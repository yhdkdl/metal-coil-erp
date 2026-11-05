from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_serializer
from app.schemas.piece import PieceRead
from app.models.coil import CoilStatus

class CoilRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    coil_number: str
    heat_number: str
    supplier: str
    grade: str
    thickness_mm: Decimal
    width_mm: Decimal
    total_weight_kg: Decimal
    cost_per_kg: Decimal
    total_cost: Decimal
    status: CoilStatus
    created_at: datetime
    @field_serializer("thickness_mm", "width_mm", "total_weight_kg", "cost_per_kg", "total_cost")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)

class CoilDetail(CoilRead):
    pieces: list[PieceRead] = []
    piece_count: int
    produced_weight_kg: Decimal
    produced_value: Decimal
    @field_serializer("produced_weight_kg", "produced_value")
    def serialize_summary_decimal(self, value: Decimal) -> str:
        return str(value)

class CoilCreate(BaseModel):
    coil_number: str
    heat_number: str
    supplier: str
    grade: str
    thickness_mm: Decimal
    width_mm: Decimal
    total_weight_kg: Decimal
    cost_per_kg: Decimal

class CoilUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    supplier: str | None = None
    grade: str | None = None
    status: CoilStatus | None = None
