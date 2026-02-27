from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import require_permissions
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import create_user, delete_user, get_user_or_404, list_users, update_user

router = APIRouter(prefix="/users", tags=["users"])


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
