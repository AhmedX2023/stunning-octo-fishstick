"""
وحدة الأمان المركزية:
- تشفير كلمات المرور بـ bcrypt (one-way hashing + salt تلقائي)
- إنشاء والتحقق من JWT access/refresh tokens
- التحقق من قوة كلمة المرور
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def validate_password_strength(password: str) -> Optional[str]:
    """
    يتحقق من قوة كلمة المرور، يرجع رسالة الخطأ أو None لو سليمة
    """
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        return f"كلمة المرور يجب أن تكون {settings.MIN_PASSWORD_LENGTH} أحرف على الأقل"
    if not re.search(r"[A-Za-z]", password):
        return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل"
    if not re.search(r"[0-9]", password):
        return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل"
    return None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def sanitize_egyptian_phone(phone: str) -> Optional[str]:
    """
    يتحقق من رقم هاتف/واتساب مصري ويعيده بصيغة موحدة، أو None لو غير صالح
    يقبل: 01XXXXXXXXX أو +201XXXXXXXXX أو 00201XXXXXXXXX
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    patterns = [
        r"^01[0125][0-9]{8}$",
        r"^\+201[0125][0-9]{8}$",
        r"^00201[0125][0-9]{8}$",
        r"^201[0125][0-9]{8}$",
    ]
    for pattern in patterns:
        if re.match(pattern, cleaned):
            digits = re.sub(r"\D", "", cleaned)
            if digits.startswith("00"):
                digits = digits[2:]
            if digits.startswith("01"):
                digits = "20" + digits[1:]
            return digits  # صيغة دولية بدون +: 201XXXXXXXXX
    return None
