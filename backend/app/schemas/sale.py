from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.sale import SaleType

class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sale_number: str
    customer_name: str
    sale_type: SaleType
    warehouse_id: UUID
    total_amount: Decimal
    created_at: datetime

