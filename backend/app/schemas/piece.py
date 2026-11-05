from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_serializer
from app.models.piece import PieceStatus

class PieceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    piece_code: str
    parent_coil_id: UUID
    production_run_id: UUID | None
    thickness_mm: Decimal
    width_mm: Decimal
    length_mm: Decimal
    weight_kg: Decimal
    grade: str
    category: str
    allocated_cost: Decimal
    selling_price: Decimal | None
    status: PieceStatus
    current_warehouse_id: UUID
    created_at: datetime
    @field_serializer("thickness_mm", "width_mm", "length_mm", "weight_kg", "allocated_cost", "selling_price")
    def serialize_decimal(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None

class PieceCreate(BaseModel):
    piece_code: str
    thickness_mm: Decimal
    width_mm: Decimal
    length_mm: Decimal
    weight_kg: Decimal
    grade: str
    category: str
    allocated_cost: Decimal
    selling_price: Decimal | None = None
    current_warehouse_id: UUID
