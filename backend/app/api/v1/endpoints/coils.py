from fastapi import APIRouter, Depends
from typing import Annotated
from sqlalchemy import select
from app.api.deps import DbSession
from app.models.coil import Coil
from app.schemas.coil import CoilRead
from app.models.user import User, UserRole
from app.api.deps import require_roles

router = APIRouter()
@router.get("/", response_model=list[CoilRead])
def list_coils(db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.FINANCE))]):
    return list(db.scalars(select(Coil).order_by(Coil.created_at.desc())))

