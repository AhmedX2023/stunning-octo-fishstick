"""
راوتر إدارة المستخدمين: للأدمن فقط - عرض/تعطيل حسابات العملاء
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.schemas.user_schema import UserOut

router = APIRouter(prefix="/api/admin/users", tags=["إدارة المستخدمين"])


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(User).filter(User.role == UserRole.CUSTOMER).order_by(User.created_at.desc()).all()


@router.put("/{user_id}/toggle-active", response_model=UserOut)
def toggle_active(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="لا يمكن تعطيل حساب أدمن")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
