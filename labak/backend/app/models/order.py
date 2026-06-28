from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"          # طلب جديد - في الانتظار
    CONFIRMED = "confirmed"      # تم تأكيده من الأدمن
    PROCESSING = "processing"    # جاري التجهيز
    SHIPPED = "shipped"          # تم الشحن
    DELIVERED = "delivered"      # تم التسليم
    CANCELLED = "cancelled"      # ملغي


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, nullable=False, index=True)

    # المستخدم (ممكن يكون null لو طلب كزائر)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="orders")

    # بيانات العميل (مطلوبة دايماً سواء عضو أو زائر)
    customer_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)          # رقم الهاتف
    whatsapp = Column(String(20), nullable=False)        # رقم الواتساب
    city = Column(String(80), nullable=False)
    address = Column(String(300), nullable=False)
    notes = Column(Text, nullable=True)

    total_amount = Column(Float, nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    order = relationship("Order", back_populates="items")

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product = relationship("Product", back_populates="order_items")

    product_name_snapshot = Column(String(200), nullable=False)  # حفظ الاسم وقت الشراء
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
