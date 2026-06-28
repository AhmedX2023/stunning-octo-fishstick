"""
إعدادات التطبيق المركزية
كل القيم الحساسة تُقرأ من متغيرات البيئة (.env) ولا تُكتب مباشرة في الكود
"""
import os
import secrets
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ---------- عام ----------
    APP_NAME: str = "لابك عندنا"
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = ENV != "production"

    # ---------- قاعدة البيانات ----------
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./labak.db")

    # ---------- الأمان / JWT ----------
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(64))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---------- كلمات المرور ----------
    MIN_PASSWORD_LENGTH: int = 8

    # ---------- محاولات الدخول ----------
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # ---------- CORS (نص خام، يتحول لقائمة يدويًا تحت) ----------
    ALLOWED_ORIGINS_RAW: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500"
    )

    # ---------- رفع الملفات ----------
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    UPLOAD_DIR: str = "app/static/uploads"

    # ---------- الأدمن الافتراضي (يُستخدم فقط عند أول تشغيل) ----------
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@labak.local")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "ChangeMe123!@#")

    # ---------- واتساب الأدمن (لتوجيه الطلبات) ----------
    ADMIN_WHATSAPP_NUMBER: str = os.getenv("ADMIN_WHATSAPP_NUMBER", "201000000000")

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()