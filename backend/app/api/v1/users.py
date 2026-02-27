from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.user import UserMeResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user=Depends(get_current_user)):
    roles = UserService.get_role_names(current_user)
    permissions = sorted(UserService.get_permission_names(current_user))
    return UserMeResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        roles=roles,
        permissions=permissions,
    )
