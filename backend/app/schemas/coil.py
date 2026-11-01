from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict
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

