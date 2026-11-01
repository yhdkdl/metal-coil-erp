from fastapi import APIRouter
from app.api.deps import get_current_user
from fastapi import Depends
from typing import Annotated
from app.models.user import User
from app.schemas.piece import PieceRead

router = APIRouter()
@router.get("/", response_model=list[PieceRead])
def list_pieces(_: Annotated[User, Depends(get_current_user)]):
    return []
