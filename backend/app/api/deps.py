from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.services.user_service import UserService


def get_current_user(request: Request, db: Session = Depends(get_db)):
    if getattr(request.state, "user", None) is not None:
        return request.state.user

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = auth_header.replace("Bearer ", "", 1)
    try:
        username = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc

    user = UserService(db).get_by_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
