from fastapi import APIRouter, Depends
from typing import Annotated
from app.api.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.stock_movement import StockMovementRead
router = APIRouter()

@router.get("/", response_model=list[StockMovementRead])
def list_stock_movements(_: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    return []
