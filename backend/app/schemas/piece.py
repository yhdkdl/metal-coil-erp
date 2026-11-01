from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.piece import PieceStatus

class PieceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    piece_code: str
    parent_coil_id: UUID
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

