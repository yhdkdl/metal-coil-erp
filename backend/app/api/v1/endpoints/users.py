from fastapi import APIRouter
from app.api.deps import DbSession, get_current_user
from app.schemas.user import UserRead
from fastapi import Depends
from typing import Annotated
from app.models.user import User

router = APIRouter()
@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

