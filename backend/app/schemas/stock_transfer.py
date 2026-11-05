from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class StockTransferCreate(BaseModel):
    piece_ids: list[UUID] = Field(min_length=1)
    to_warehouse_id: UUID
    note: str | None = Field(default=None, max_length=500)


class StockTransferPiece(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    piece_code: str
    weight_kg: Decimal
    status: str
    current_warehouse_id: UUID

    @field_serializer("weight_kg")
    def serialize_weight(self, value: Decimal) -> str:
        return str(value)


class StockTransferResult(BaseModel):
    transfer_group_id: UUID
    moved_count: int
    pieces: list[StockTransferPiece]


class StockTransferSummary(BaseModel):
    transfer_group_id: UUID
    created_at: datetime
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    note: str | None
    piece_count: int
    total_weight_kg: Decimal

    @field_serializer("total_weight_kg")
    def serialize_total_weight(self, value: Decimal) -> str:
        return str(value)
