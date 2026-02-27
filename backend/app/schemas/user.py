from pydantic import BaseModel, ConfigDict, EmailStr


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    is_active: bool
    roles: list[str]
    permissions: list[str]
