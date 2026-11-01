from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
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

