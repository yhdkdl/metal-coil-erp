from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.user import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class AdminUserCreate(UserCreate):
    role: UserRole = UserRole.SALES

class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
