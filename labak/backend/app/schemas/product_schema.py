from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional
from datetime import datetime


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str


class ProductBase(BaseModel):
    name: str
    brand: str
    description: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    screen: Optional[str] = None
    battery: Optional[str] = None
    weight: Optional[str] = None
    os: Optional[str] = None
    price: float
    discount_price: Optional[float] = None
    stock_quantity: int = 0
    category_id: Optional[int] = None
    is_featured: bool = False
    is_active: bool = True

    @field_validator("name", "brand")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("القيمة غير صالحة")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0 or v > 10_000_000:
            raise ValueError("السعر غير منطقي")
        return v

    @field_validator("discount_price")
    @classmethod
    def discount_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("سعر الخصم غير صالح")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def stock_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("الكمية لا يمكن أن تكون سالبة")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    screen: Optional[str] = None
    battery: Optional[str] = None
    weight: Optional[str] = None
    os: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    image_url: Optional[str] = None
    rating: float
    created_at: datetime
    category: Optional[CategoryOut] = None
