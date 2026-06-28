"""
راوتر الطلبات:
- إنشاء طلب جديد (متاح للأعضاء والزوار)
- توليد رابط واتساب تلقائي لإشعار الأدمن
- عمليات إدارية للأدمن: عرض/تحديث حالة الطلبات
"""
import random
import string
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import get_current_user_optional, require_admin
from app.core.limiter import limiter
from app.core.config import settings
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order_schema import OrderCreate, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/api/orders", tags=["الطلبات"])


def generate_order_number() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%y%m%d")
    rand = "".join(random.choices(string.digits, k=4))
    return f"LB-{timestamp}-{rand}"


def build_whatsapp_link(order: Order) -> str:
    lines = [
        f"طلب جديد رقم {order.order_number}",
        f"العميل: {order.customer_name}",
        f"الهاتف: {order.phone}",
        f"المدينة: {order.city}",
        f"العنوان: {order.address}",
        "---",
    ]
    for item in order.items:
        lines.append(f"- {item.product_name_snapshot} × {item.quantity} = {item.unit_price * item.quantity:.0f} ج.م")
    lines.append("---")
    lines.append(f"الإجمالي: {order.total_amount:.0f} ج.م")
    if order.notes:
        lines.append(f"ملاحظات: {order.notes}")

    import urllib.parse
    message = urllib.parse.quote("\n".join(lines))
    return f"https://wa.me/{settings.ADMIN_WHATSAPP_NUMBER}?text={message}"


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_order(
    request: Request,
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # التحقق من توفر المنتجات وحساب الإجمالي على السيرفر (عدم الثقة بأي سعر من العميل)
    total = 0.0
    order_items_data = []

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()  # noqa: E712
        if not product:
            raise HTTPException(status_code=404, detail=f"منتج غير موجود (id={item.product_id})")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"الكمية المتوفرة من {product.name} غير كافية")

        unit_price = product.final_price
        total += unit_price * item.quantity
        order_items_data.append((product, unit_price, item.quantity))

    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id if current_user else None,
        customer_name=payload.customer_name,
        phone=payload.phone,
        whatsapp=payload.whatsapp,
        city=payload.city,
        address=payload.address,
        notes=payload.notes,
        total_amount=total,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    db.flush()

    for product, unit_price, quantity in order_items_data:
        db.add(OrderItem(
            order_id=order.id, product_id=product.id,
            product_name_snapshot=product.name, unit_price=unit_price, quantity=quantity,
        ))
        product.stock_quantity -= quantity  # خصم المخزون

    db.commit()
    db.refresh(order)

    whatsapp_link = build_whatsapp_link(order)

    return {
        "order": OrderOut.model_validate(order),
        "whatsapp_link": whatsapp_link,
    }


@router.get("/my-orders", response_model=List[OrderOut])
def my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="يرجى تسجيل الدخول لعرض طلباتك")
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@router.get("/track/{order_number}", response_model=OrderOut)
@limiter.limit("15/minute")
def track_order(request: Request, order_number: str, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.order_number == order_number)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="رقم الطلب غير موجود")
    return order


# ---------------- إدارة الطلبات (أدمن فقط) ----------------

@router.get("/admin/all", response_model=List[OrderOut])
def admin_list_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    status_filter: Optional[OrderStatus] = None,
    page: int = 1,
    page_size: int = 50,
):
    query = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.offset((page - 1) * page_size).limit(page_size).all()


@router.put("/admin/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
