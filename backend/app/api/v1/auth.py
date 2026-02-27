from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.services.auth_service import authenticate_user, issue_tokens, revoke_refresh_token, rotate_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.authenticate(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token, refresh_token = service.create_token_pair(user)
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    access_token, refresh_token = issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    token_pair = service.refresh_access_token(payload.refresh_token)
    if not token_pair:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    access_token, refresh_token = token_pair
    try:
        access_token, refresh_token = rotate_refresh_token(db, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    revoked = AuthService(db).revoke_refresh_token(payload.refresh_token)
    if not revoked:
        raise HTTPException(status_code=404, detail="Refresh token not found")
    return {"message": "Logged out successfully"}
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, payload.refresh_token)
    return {"message": "Logout realizado"}
