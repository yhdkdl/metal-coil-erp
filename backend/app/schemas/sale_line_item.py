from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class SaleLineItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sale_id: UUID
    piece_id: UUID
    sale_price: Decimal
    created_at: datetime

