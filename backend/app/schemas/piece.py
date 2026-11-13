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
    min_selling_price: Decimal
    selling_price: Decimal | None
    status: PieceStatus
    current_warehouse_id: UUID
    warehouse_name: str | None = None
    created_at: datetime
    @field_serializer("thickness_mm", "width_mm", "length_mm", "weight_kg", "allocated_cost", "min_selling_price", "selling_price")
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


class PieceStockSummary(BaseModel):
    category: str
    thickness_mm: Decimal
    total_pieces: int
    in_stock_pieces: int
    in_main: int
    in_outlet: int
    sold: int

    @field_serializer("thickness_mm")
    def serialize_thickness(self, value: Decimal) -> str:
        return str(value)
