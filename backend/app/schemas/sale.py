from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_serializer
from app.models.sale import SaleStatus, SaleType
from app.models.payment import PaymentMethod

class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sale_number: str
    customer_name: str
    sale_type: SaleType
    warehouse_id: UUID
    warehouse_name: str | None = None
    total_amount: Decimal
    status: SaleStatus
    notes: str | None
    created_by_id: UUID
    completed_at: datetime | None
    created_at: datetime
    @field_serializer("total_amount")
    def serialize_total(self, value: Decimal) -> str:
        return str(value)

class SaleLineItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    piece_id: UUID
    sale_price: Decimal = Field(gt=0)

class SaleLineItemRead(SaleLineItemCreate):
    piece_code: str | None = None
    category: str | None = None
    grade: str | None = None
    thickness_mm: Decimal | None = None
    width_mm: Decimal | None = None
    length_mm: Decimal | None = None
    weight_kg: Decimal | None = None

    @field_serializer("sale_price")
    def serialize_sale_price(self, value: Decimal) -> str:
        return str(value)

    @field_serializer("thickness_mm", "width_mm", "length_mm", "weight_kg", check_fields=False)
    def serialize_decimals(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None

class SaleCreate(BaseModel):
    sale_type: SaleType
    customer_name: str = Field(min_length=1, max_length=255)
    warehouse_id: UUID
    line_items: list[SaleLineItemCreate] = Field(min_length=1)
    notes: str | None = Field(default=None, max_length=1000)

class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    method: PaymentMethod
    reference: str | None = Field(default=None, max_length=255)

class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sale_id: UUID
    amount: Decimal
    method: PaymentMethod
    reference: str | None
    paid_at: datetime
    recorded_by_id: UUID
    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> str:
        return str(value)

class SaleDetail(SaleRead):
    line_items: list[SaleLineItemRead]
    payments: list[PaymentRead]
    amount_paid: Decimal
    amount_due: Decimal
    @field_serializer("amount_paid", "amount_due")
    def serialize_balance(self, value: Decimal) -> str:
        return str(value)
