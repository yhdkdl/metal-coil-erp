from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_serializer
from app.models.production_run import ProductionRunStatus

class ProductionRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    coil_id: UUID
    machine_type: str
    operator_id: UUID
    status: ProductionRunStatus
    started_at: datetime
    completed_at: datetime | None

class ProductionRunCreate(BaseModel):
    coil_id: UUID
    machine_type: str = Field(min_length=1, max_length=100)

class ProductionRunUpdate(BaseModel):
    machine_type: str | None = Field(default=None, min_length=1, max_length=100)

class ProductionRunOutputCreate(BaseModel):
    thickness_mm: Decimal = Field(gt=0)
    width_mm: Decimal = Field(gt=0)
    length_mm: Decimal = Field(gt=0)
    weight_kg: Decimal = Field(gt=0)
    grade: str
    category: str

class ProductionRunOutputRead(ProductionRunOutputCreate):
    id: UUID
    production_run_id: UUID
    created_at: datetime
    @field_serializer("thickness_mm", "width_mm", "length_mm", "weight_kg")
    def serialize_decimal(self, value: Decimal | None) -> str | None:
        return str(value) if value is not None else None

class ProductionRunDetail(ProductionRunRead):
    outputs: list[ProductionRunOutputRead] = []
    total_output_weight_kg: Decimal
    @field_serializer("total_output_weight_kg")
    def serialize_total(self, value: Decimal) -> str:
        return str(value)
