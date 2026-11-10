from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from app.api.deps import DbSession, get_current_user, require_roles
from app.core.security import hash_password
from app.schemas.user import AdminUserCreate, UserRead, UserUpdate
from typing import Annotated
from app.models.user import User, UserRole

router = APIRouter()
@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

@router.get("/", response_model=list[UserRead])
def list_users(db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    return list(db.scalars(select(User).order_by(User.email)))

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(409, "Email is already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password), full_name=payload.full_name, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id, payload: UserUpdate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.ADMIN))]):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user
