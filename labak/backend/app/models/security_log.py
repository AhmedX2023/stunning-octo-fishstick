from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone
from app.core.database import Base


class SecurityLog(Base):
    """
    سجل الأحداث الأمنية: محاولات تسجيل الدخول، الأنشطة الحساسة في لوحة الأدمن
    يساعد في كشف أي نشاط مشبوه
    """
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # login_success, login_failed, account_locked, admin_action...
    email = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(300), nullable=True)
    details = Column(String(500), nullable=True)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Subscriber(Base):
    """مشتركين النشرة البريدية / تنبيهات العروض (اختياري لكن مفيد للأدمن)"""
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    contact = Column(String(255), unique=True, nullable=False)  # رقم أو إيميل
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
