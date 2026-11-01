from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.warehouse import WarehouseType

class WarehouseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    type: WarehouseType

