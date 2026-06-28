"""
راوتر التوثيق: تسجيل مستخدمين جدد، تسجيل الدخول، تجديد التوكن
يتضمن حماية ضد هجمات Brute force عبر قفل الحساب بعد محاولات فاشلة متكررة
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.core.deps import get_client_ip, get_current_user
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.models.user import User, UserRole
from app.models.security_log import SecurityLog
from app.schemas.user_schema import UserRegister, UserLogin, UserOut, TokenResponse, RefreshRequest

router = APIRouter(prefix="/api/auth", tags=["التوثيق"])


def log_event(db: Session, event_type: str, email: str, ip: str, user_agent: str, success: bool, details: str = ""):
    log = SecurityLog(
        event_type=event_type, email=email, ip_address=ip,
        user_agent=user_agent[:300] if user_agent else "", success=success, details=details[:500],
    )
    db.add(log)
    db.commit()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(db, "register", user.email, get_client_ip(request), request.headers.get("user-agent", ""), True)

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("8/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "")
    email = payload.email.lower()

    user = db.query(User).filter(User.email == email).first()

    # رسالة خطأ موحدة لمنع تسريب معلومات عن وجود الحساب من عدمه
    generic_error = "البريد الإلكتروني أو كلمة المرور غير صحيحة"

    if user and user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() / 60) + 1
        log_event(db, "login_blocked_locked", email, ip, ua, False, "account locked")
        raise HTTPException(status_code=403, detail=f"الحساب مقفل مؤقتاً، حاول بعد {remaining} دقيقة")

    if not user or not verify_password(payload.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
                log_event(db, "account_locked", email, ip, ua, False, "too many failed attempts")
            db.commit()
        log_event(db, "login_failed", email, ip, ua, False)
        raise HTTPException(status_code=401, detail=generic_error)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="هذا الحساب معطل، تواصل مع الدعم")

    # نجاح الدخول: إعادة تصفير العداد
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    log_event(db, "login_success", email, ip, ua, True)

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
def refresh_token_endpoint(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="رمز التجديد غير صالح")

    user = db.query(User).filter(User.id == int(decoded.get("sub"))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=new_refresh, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
