from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    role_ids: list[int] = []


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)
    role_ids: list[int] | None = None


class PermissionOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class RoleOut(BaseModel):
    id: int
    name: str
    permissions: list[PermissionOut] = []

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime
    roles: list[RoleOut] = []

    model_config = {"from_attributes": True}
