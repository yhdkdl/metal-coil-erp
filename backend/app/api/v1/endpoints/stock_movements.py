from fastapi import APIRouter, Depends
from typing import Annotated
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.stock_movement import StockMovementRead
router = APIRouter()

@router.get("/", response_model=list[StockMovementRead])
def list_stock_movements(_: Annotated[User, Depends(get_current_user)]):
    return []
