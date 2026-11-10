from fastapi import APIRouter, Depends
from sqlalchemy import select
from typing import Annotated
from app.api.deps import DbSession
from app.api.deps import require_roles
from app.models import StockMovement, User, UserRole
from app.schemas.stock_movement import StockMovementRead
router = APIRouter()

@router.get("/", response_model=list[StockMovementRead])
def list_stock_movements(db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    return list(db.scalars(select(StockMovement).order_by(StockMovement.created_at.desc())))
