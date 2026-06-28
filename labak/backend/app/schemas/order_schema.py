import re
from pydantic import BaseModel, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_valid(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("الكمية يجب أن تكون بين 1 و 20")
        return v


class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    whatsapp: str
    city: str
    address: str
    notes: Optional[str] = None
    items: List[OrderItemCreate]

    @field_validator("customer_name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 120:
            raise ValueError("اسم العميل غير صالح")
        if re.search(r"[<>{}]", v):
            raise ValueError("الاسم يحتوي على رموز غير مسموحة")
        return v

    @field_validator("phone", "whatsapp")
    @classmethod
    def phone_format(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^(\+?20|0)?1[0125][0-9]{8}$", cleaned):
            raise ValueError("رقم الهاتف غير صالح - يجب أن يكون رقم مصري صحيح")
        return cleaned

    @field_validator("city", "address")
    @classmethod
    def text_field_valid(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 300:
            raise ValueError("القيمة غير صالحة")
        return v

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: List[OrderItemCreate]) -> List[OrderItemCreate]:
        if not v or len(v) == 0:
            raise ValueError("السلة فارغة")
        if len(v) > 50:
            raise ValueError("عدد العناصر كبير جداً")
        return v


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name_snapshot: str
    unit_price: float
    quantity: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    customer_name: str
    phone: str
    whatsapp: str
    city: str
    address: str
    notes: Optional[str] = None
    total_amount: float
    status: OrderStatus
    created_at: datetime
    items: List[OrderItemOut] = []


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
