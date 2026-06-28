from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    brand = Column(String(80), nullable=False, index=True)
    slug = Column(String(220), unique=True, nullable=False, index=True)

    description = Column(Text, nullable=True)

    # مواصفات
    cpu = Column(String(150), nullable=True)
    gpu = Column(String(150), nullable=True)
    ram = Column(String(50), nullable=True)
    storage = Column(String(80), nullable=True)
    screen = Column(String(120), nullable=True)
    battery = Column(String(80), nullable=True)
    weight = Column(String(40), nullable=True)
    os = Column(String(60), nullable=True)

    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)  # لو فيه عرض
    stock_quantity = Column(Integer, default=0, nullable=False)

    image_url = Column(String(500), nullable=True)
    extra_images = Column(Text, nullable=True)  # JSON string لصور إضافية

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")

    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    rating = Column(Float, default=4.5)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    order_items = relationship("OrderItem", back_populates="product")

    @property
    def final_price(self) -> float:
        return self.discount_price if self.discount_price else self.price

    @property
    def in_stock(self) -> bool:
        return self.stock_quantity > 0
