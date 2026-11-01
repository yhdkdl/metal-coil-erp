from fastapi import APIRouter, Depends
from typing import Annotated
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.production_run import ProductionRunRead
router = APIRouter()

@router.get("/", response_model=list[ProductionRunRead])
def list_production_runs(_: Annotated[User, Depends(get_current_user)]):
    return []
