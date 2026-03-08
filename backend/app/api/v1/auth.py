from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User, RefreshToken
from app.services import audit_service, lockout_service
from app.core.security import (
    create_access_token,
    decode_access_token,
    verify_password,
    generate_refresh_token,
    refresh_token_expires_at,
)
from app.services.jwt_blacklist_service import blacklist_token
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


def _extract_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _extract_ua(request: Request | None) -> str | None:
    if request is None:
        return None
    return (request.headers.get("User-Agent") or "")[:512]


class LoginIn(BaseModel):
    """Aceita email ou username (ambos são usados como email para login)."""
    email: str | None = None
    username: str | None = None
    password: str

    @model_validator(mode="after")
    def require_email_or_username(self):
        if not self.email and not self.username:
            raise ValueError("Envie 'email' ou 'username'")
        return self

    def get_login_email(self) -> str:
        """E-mail a usar na busca (prioridade: email, depois username)."""
        return (self.email or self.username or "").strip()


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, data: LoginIn, db: Session = Depends(get_db)):
    email = data.get_login_email()
    user: User | None = db.execute(
        select(User).where(User.email == email, User.deleted_at.is_(None))
    ).scalar_one_or_none()

    # Usuário não encontrado
    if not user:
        audit_service.log_event(
            db, action="login.failure", result="failure",
            user_email=email, detail="user_not_found", request=request,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # Conta bloqueada
    if user.is_locked:
        audit_service.log_event(
            db, action="login.failure", result="failure",
            user_id=user.id, user_email=user.email,
            detail="account_locked", request=request,
        )
        db.commit()
        raise HTTPException(
            status_code=423,
            detail=f"Conta bloqueada temporariamente. Tente novamente em {settings.account_lockout_minutes} minutos.",
        )

    # Senha inválida
    if not verify_password(data.password, user.hashed_password):
        locked = lockout_service.check_and_apply_lockout(db, user)
        audit_service.log_event(
            db, action="login.failure", result="failure",
            user_id=user.id, user_email=user.email,
            detail="invalid_password" + (" — account_locked" if locked else ""),
            request=request,
        )
        db.commit()
        if locked:
            raise HTTPException(
                status_code=423,
                detail=f"Conta bloqueada após {settings.account_lockout_attempts} tentativas. Tente em {settings.account_lockout_minutes} minutos.",
            )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # Usuário inativo
    if not user.is_active:
        audit_service.log_event(
            db, action="login.failure", result="failure",
            user_id=user.id, user_email=user.email,
            detail="user_inactive", request=request,
        )
        db.commit()
        raise HTTPException(status_code=403, detail="Usuário inativo")

    # Login bem-sucedido: zera contador e registra
    lockout_service.reset_lockout(db, user)

    raw_refresh = generate_refresh_token()
    expires_at = refresh_token_expires_at()
    ip = _extract_ip(request)
    ua = _extract_ua(request)

    rt = RefreshToken(
        token_id=raw_refresh,
        user_id=user.id,
        expires_at=expires_at,
        revoked=False,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(rt)
    access = create_access_token(user.email)

    audit_service.log_event(
        db, action="login.success", result="success",
        user_id=user.id, user_email=user.email,
        request=request,
    )
    db.commit()

    return TokenOut(access_token=access, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("10/minute")
def refresh(request: Request, data: RefreshIn, db: Session = Depends(get_db)):
    rt: RefreshToken | None = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == data.refresh_token)
    ).scalar_one_or_none()

    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    now = datetime.now(timezone.utc)
    expires = rt.expires_at if rt.expires_at.tzinfo else rt.expires_at.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired refresh token")

    user: User | None = db.execute(
        select(User).where(User.id == rt.user_id)
    ).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    rt.revoked = True
    new_refresh = generate_refresh_token()
    new_expires = refresh_token_expires_at()
    ip = _extract_ip(request)
    ua = _extract_ua(request)

    new_rt = RefreshToken(
        token_id=new_refresh,
        user_id=user.id,
        expires_at=new_expires,
        revoked=False,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(new_rt)
    db.commit()

    access = create_access_token(user.email)
    return TokenOut(access_token=access, refresh_token=new_refresh)


def _extract_access_token_from_header(authorization: str | None) -> str | None:
    """Extrai o access token do header Authorization Bearer."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[7:].strip() or None


@router.post("/logout")
def logout(
    request: Request,
    data: LogoutIn,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    access_token = _extract_access_token_from_header(authorization)
    if access_token:
        try:
            payload = decode_access_token(access_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp is not None:
                blacklist_token(jti, exp)
        except ValueError:
            pass

    rt: RefreshToken | None = db.execute(
        select(RefreshToken).where(RefreshToken.token_id == data.refresh_token)
    ).scalar_one_or_none()

    if rt:
        audit_service.log_event(
            db, action="logout", result="success",
            user_id=rt.user_id,
            resource_type="session", resource_id=data.refresh_token,
            request=request,
        )
        rt.revoked = True
        db.commit()

    return {"ok": True}


@router.post("/logout-all")
def logout_all(
    request: Request,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Encerra todas as sessões do usuário e blacklista o access token atual."""
    access_token = _extract_access_token_from_header(authorization)
    if access_token:
        try:
            payload = decode_access_token(access_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp is not None:
                blacklist_token(jti, exp)
        except ValueError:
            pass

    tokens = db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == user.id)
    ).all()
    for rt in tokens:
        rt.revoked = True

    audit_service.log_event(
        db, action="logout.all", result="success",
        user_id=user.id, user_email=user.email,
        request=request,
    )
    db.commit()

    return {"ok": True, "message": "Todas as sessões foram encerradas."}
