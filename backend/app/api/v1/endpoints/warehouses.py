from fastapi import APIRouter, Depends
from typing import Annotated
from sqlalchemy import select
from app.api.deps import DbSession, require_roles
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseRead

router = APIRouter()
@router.get("/", response_model=list[WarehouseRead])
def list_warehouses(db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.SALES, UserRole.PRODUCTION, UserRole.FINANCE))]):
    return list(db.scalars(select(Warehouse).order_by(Warehouse.name)))
