import re
from pydantic import BaseModel, EmailStr, field_validator


def _validate_password_strength(v: str) -> str:
    """Valida complexidade mínima de senha."""
    if len(v) < 8:
        raise ValueError("Senha deve ter pelo menos 8 caracteres")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Senha deve conter pelo menos 1 letra maiúscula")
    if not re.search(r"[a-z]", v):
        raise ValueError("Senha deve conter pelo menos 1 letra minúscula")
    if not re.search(r"\d", v):
        raise ValueError("Senha deve conter pelo menos 1 número")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", v):
        raise ValueError("Senha deve conter pelo menos 1 caractere especial")
    return v


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    is_active: bool = True
    role_ids: list[int] | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nome completo não pode ser vazio")
        return v.strip()


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None
    role_ids: list[int] | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_password_strength(v)
        return v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    roles: list[str] = []
    permissions: list[str] = []

    model_config = {"from_attributes": True}
