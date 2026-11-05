from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class RevenuePeriod(BaseModel):
    start: datetime
    end: datetime
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
    sale_count: int

    @field_serializer("revenue", "cogs", "gross_profit")
    def serialize_money(self, value: Decimal) -> str:
        return str(value)


class RevenueReport(BaseModel):
    periods: list[RevenuePeriod]
    totals: dict[str, str]


class ProfitByCoilRow(BaseModel):
    coil_number: str
    coil_cost: Decimal
    pieces_sold_count: int
    pieces_unsold_count: int
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal

    @field_serializer("coil_cost", "revenue", "cogs", "gross_profit")
    def serialize_money(self, value: Decimal) -> str:
        return str(value)


class InventoryWarehouseValue(BaseModel):
    warehouse_id: UUID
    warehouse_name: str
    piece_count: int
    cost_value: Decimal
    list_value: Decimal

    @field_serializer("cost_value", "list_value")
    def serialize_money(self, value: Decimal) -> str:
        return str(value)


class InventoryValuation(BaseModel):
    by_warehouse: list[InventoryWarehouseValue]
    total_pieces: int
    total_cost_value: Decimal
    total_list_value: Decimal
    null_price_count: int

    @field_serializer("total_cost_value", "total_list_value")
    def serialize_money(self, value: Decimal) -> str:
        return str(value)


class PriceHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    piece_id: UUID
    old_price: Decimal | None
    new_price: Decimal
    changed_by_id: UUID
    reason: str | None
    changed_at: datetime

    @field_serializer("old_price", "new_price")
    def serialize_money(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None


class PriceAdjustment(BaseModel):
    type: str = Field(pattern="^(percent|absolute)$")
    value: Decimal


class BulkPriceUpdate(BaseModel):
    filter: dict[str, str | UUID | None] = {}
    adjustment: PriceAdjustment
    reason: str | None = Field(default=None, max_length=255)
