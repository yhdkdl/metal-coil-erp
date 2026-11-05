from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_serializer
from app.models.stock_movement import MovementType

class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    piece_id: UUID | None
    coil_id: UUID | None
    transfer_group_id: UUID | None
    movement_type: MovementType
    from_warehouse_id: UUID | None
    to_warehouse_id: UUID | None
    weight_kg: Decimal
    note: str | None
    created_at: datetime
    created_by_id: UUID
    @field_serializer("weight_kg")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)
