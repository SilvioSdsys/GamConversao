from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.user import UserMeResponse
from app.services.user_service import UserService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import require_permissions
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import create_user, delete_user, get_user_or_404, list_users, update_user

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
@router.get("", response_model=list[UserOut])
@require_permissions("users:read")
async def get_users(db: Session = Depends(get_db)):
    return list_users(db)


@router.get("/{user_id}", response_model=UserOut)
@require_permissions("users:read")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    return get_user_or_404(db, user_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserOut)
@require_permissions("users:create")
async def post_user(payload: UserCreate, db: Session = Depends(get_db)):
    return create_user(db, payload)


@router.put("/{user_id}", response_model=UserOut)
@require_permissions("users:update")
async def put_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = get_user_or_404(db, user_id)
    return update_user(db, user, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permissions("users:delete")
async def remove_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_or_404(db, user_id)
    delete_user(db, user)
